'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRoles } from '@/lib/auth';
import { createServerActionClient } from '@/lib/supabase/server';

const createOrderSchema = z.object({
  tableId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(20),
        note: z.string().max(120).optional(),
      })
    )
    .min(1, 'Select at least one item.'),
});

export async function createOrderAction(input: unknown) {
  const profile = await requireRoles(['waiter', 'admin']);
  const parsed = createOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Neispravan format narudžbe.' };
  }

  const supabase = await createServerActionClient();

  const productIds = parsed.data.items.map((i) => i.productId);
  const { data: products, error: productError } = (await supabase
    .from('products')
    .select('id, category, is_available')
    .in('id', productIds)) as {
    data:
      | {
          id: string;
          category: 'drink' | 'shisha';
          is_available: boolean;
        }[]
      | null;
    error: { message: string } | null;
  };

  if (productError || !products) {
    return { error: 'Provjera proizvoda nije uspjela.' };
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  for (const item of parsed.data.items) {
    const product = productMap.get(item.productId);
    if (!product || !product.is_available) {
      return { error: 'Jedan ili više proizvoda nije dostupan.' };
    }

    if (product.category === 'shisha' && !item.note?.trim()) {
      return { error: 'Za svaku nargilu je obavezna mješavina okusa.' };
    }
  }

  const hasDrink = parsed.data.items.some((item) => productMap.get(item.productId)?.category === 'drink');
  const hasShisha = parsed.data.items.some((item) => productMap.get(item.productId)?.category === 'shisha');

  const { data: order, error: orderError } = (await supabase
    .from('orders')
    .insert({
      table_id: parsed.data.tableId,
      created_by_user: profile.id,
      status: 'new',
    })
    .select('id')
    .single()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (orderError || !order) {
    return { error: orderError?.message ?? 'Kreiranje narudžbe nije uspjelo.' };
  }

  const { error: stationError } = await supabase.from('order_station_status').insert({
    order_id: order.id,
    bar_status: hasDrink ? 'pending' : 'done',
    shisha_status: hasShisha ? 'pending' : 'done',
  });

  if (stationError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return { error: stationError.message };
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    parsed.data.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      qty: item.qty,
      note: item.note?.trim() || null,
    }))
  );

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    return { error: itemsError.message };
  }

  revalidatePath('/waiter');
  revalidatePath('/station/bar');
  revalidatePath('/station/shisha');
  revalidatePath('/admin/orders');

  return { success: true, orderId: order.id };
}
