'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRoles } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
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

  const { data: activeOrder } = (await supabase
    .from('orders')
    .select('id')
    .eq('table_id', parsed.data.tableId)
    .is('closed_at', null)
    .in('status', ['new', 'in_progress', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()) as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  let orderId = activeOrder?.id ?? null;
  let createdNewOrder = false;

  if (!orderId) {
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

    orderId = order.id;
    createdNewOrder = true;

    const { error: stationError } = await supabase.from('order_station_status').insert({
      order_id: orderId,
      bar_status: hasDrink ? 'pending' : 'done',
      shisha_status: hasShisha ? 'pending' : 'done',
    });

    if (stationError) {
      await supabase.from('orders').delete().eq('id', orderId);
      return { error: stationError.message };
    }
  } else {
    const { data: existingStation } = (await supabase
      .from('order_station_status')
      .select('bar_status, shisha_status')
      .eq('order_id', orderId)
      .maybeSingle()) as {
      data: { bar_status: 'pending' | 'done'; shisha_status: 'pending' | 'done' } | null;
      error: { message: string } | null;
    };

    if (existingStation) {
      const { error: stationUpdateError } = await supabase
        .from('order_station_status')
        .update({
          bar_status: hasDrink ? 'pending' : existingStation.bar_status,
          shisha_status: hasShisha ? 'pending' : existingStation.shisha_status,
        })
        .eq('order_id', orderId);

      if (stationUpdateError) {
        return { error: stationUpdateError.message };
      }
    } else {
      const { error: stationInsertError } = await supabase.from('order_station_status').insert({
        order_id: orderId,
        bar_status: hasDrink ? 'pending' : 'done',
        shisha_status: hasShisha ? 'pending' : 'done',
      });
      if (stationInsertError) {
        return { error: stationInsertError.message };
      }
    }
  }

  const { error: itemsError } = await supabase.from('order_items').insert(
    parsed.data.items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      qty: item.qty,
      is_new: !createdNewOrder,
      note: item.note?.trim() || null,
    }))
  );

  if (itemsError) {
    if (createdNewOrder) {
      await supabase.from('orders').delete().eq('id', orderId);
    }
    return { error: itemsError.message };
  }

  revalidatePath('/waiter');
  revalidatePath('/station/bar');
  revalidatePath('/station/shisha');
  revalidatePath('/admin/orders');

  return { success: true, orderId };
}

const closeTableSchema = z.object({
  tableId: z.string().uuid(),
});

export async function closeTableOrdersAction(input: unknown) {
  await requireRoles(['waiter', 'admin']);
  const parsed = closeTableSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Neispravan sto.' };
  }
  const supabase = await createServerActionClient();
  const { data: activeOrders, error: activeOrdersError } = (await supabase
    .from('orders')
    .select('id')
    .eq('table_id', parsed.data.tableId)
    .is('closed_at', null)
    .in('status', ['new', 'in_progress', 'completed'])) as {
    data: { id: string }[] | null;
    error: { message: string } | null;
  };

  if (activeOrdersError) {
    return { error: activeOrdersError.message };
  }

  const orderIds = (activeOrders ?? []).map((order) => order.id);
  if (orderIds.length === 0) {
    return { success: true };
  }

  const { error: stationUpdateError } = await supabase
    .from('order_station_status')
    .update({
      bar_status: 'done',
      shisha_status: 'done',
    })
    .in('order_id', orderIds);

  if (stationUpdateError) {
    return { error: stationUpdateError.message };
  }

  const { error: closeOrdersError } = await supabase
    .from('orders')
    .update({ closed_at: new Date().toISOString() })
    .in('id', orderIds);

  if (closeOrdersError) {
    const adminSupabase = createAdminClient();
    const { error: adminCloseOrdersError } = await adminSupabase
      .from('orders')
      .update({ closed_at: new Date().toISOString() })
      .in('id', orderIds);
    if (adminCloseOrdersError) {
      return { error: adminCloseOrdersError.message };
    }
  }

  revalidatePath('/waiter');
  revalidatePath('/station/bar');
  revalidatePath('/station/shisha');
  revalidatePath('/admin/orders');
  return { success: true };
}
