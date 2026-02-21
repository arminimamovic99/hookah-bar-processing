'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRoles } from '@/lib/auth';
import { createServerActionClient } from '@/lib/supabase/server';

const updateStationSchema = z.object({
  orderId: z.string().uuid(),
  station: z.enum(['bar', 'shisha']),
});

export async function markStationDoneAction(input: unknown) {
  const parsed = updateStationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: 'Neispravan zahtjev za stanicu.' };
  }

  const { station, orderId } = parsed.data;

  if (station === 'bar') {
    await requireRoles(['bar', 'admin']);
  } else {
    await requireRoles(['shisha', 'admin']);
  }

  const supabase = await createServerActionClient();

  const { data: existingRow, error: existingRowError } = await supabase
    .from('order_station_status')
    .select('order_id, bar_status, shisha_status')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existingRowError) return { error: existingRowError.message };

  if (!existingRow) {
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('products(category)')
      .eq('order_id', orderId);

    if (itemsError) return { error: itemsError.message };

    const hasDrink = (items ?? []).some((item) => item.products?.category === 'drink');
    const hasShisha = (items ?? []).some((item) => item.products?.category === 'shisha');

    const { error: createStatusError } = await supabase.from('order_station_status').insert({
      order_id: orderId,
      bar_status: station === 'bar' ? 'done' : hasDrink ? 'pending' : 'done',
      shisha_status: station === 'shisha' ? 'done' : hasShisha ? 'pending' : 'done',
    });

    if (createStatusError) return { error: createStatusError.message };
  }

  const { data: stationRow, error } = await supabase
    .from('order_station_status')
    .update(station === 'bar' ? { bar_status: 'done' } : { shisha_status: 'done' })
    .eq('order_id', orderId)
    .select('order_id, bar_status, shisha_status')
    .single();

  if (error) return { error: error.message };
  if (!stationRow) return { error: 'Ažuriranje statusa stanice nije uspjelo.' };

  const nextOrderStatus =
    stationRow.bar_status === 'done' && stationRow.shisha_status === 'done'
      ? 'completed'
      : 'in_progress';

  const { error: orderStatusError } = await supabase
    .from('orders')
    .update({ status: nextOrderStatus })
    .eq('id', orderId);

  if (orderStatusError) return { error: orderStatusError.message };

  revalidatePath('/station/bar');
  revalidatePath('/station/shisha');
  revalidatePath('/admin/orders');
  revalidatePath('/waiter');

  return { success: true };
}
