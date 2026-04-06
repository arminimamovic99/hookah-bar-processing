import { startOfDay, startOfWeek } from '@/lib/date';
import { createClient } from '@/lib/supabase/server';
import { ProductCategory } from '@/lib/types/database';

export async function getActiveTables() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tables')
    .select('id, number, is_active')
    .eq('is_active', true)
    .order('number', { ascending: true });

  if (error) throw error;
  return (data ?? []).sort((a, b) => {
    const aNum = Number(a.number);
    const bNum = Number(b.number);
    const aIsNumeric = Number.isFinite(aNum);
    const bIsNumeric = Number.isFinite(bNum);

    if (aIsNumeric && bIsNumeric) return aNum - bNum;
    if (aIsNumeric) return -1;
    if (bIsNumeric) return 1;
    return a.number.localeCompare(b.number, 'bs');
  });
}

export async function getAvailableProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, drink_subcategory, price, is_available')
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAvailableShishaFlavors() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('shisha_flavors')
    .select('id, name, is_available')
    .eq('is_available', true)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAllProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, drink_subcategory, price, is_available, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getWaiterOrders() {
  const supabase = await createClient();
  const from = startOfDay(new Date());
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, table_id, created_at, tables(number), order_station_status(bar_status, shisha_status), order_items(id, qty, is_new, note, products(name, category, price))'
    )
    .in('status', ['new', 'in_progress', 'completed'])
    .is('closed_at', null)
    .gte('created_at', from.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  const merged = data ?? [];
  const deduped = Array.from(new Map(merged.map((order) => [order.id, order])).values()) as Array<{
    created_at: string;
  }>;
  return deduped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getStationOrders(station: ProductCategory) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, table_id, created_at, tables(number), order_station_status(bar_status, shisha_status), order_items(id, qty, is_new, note, products(name, category, price))'
    )
    .is('closed_at', null)
    .in('status', ['new', 'in_progress'])
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).filter((order) =>
    (order.order_items ?? []).some((item) => item.products?.category === station)
  );
}

export async function getAdminOrders(view: 'today' | 'week', status: 'all' | 'new' | 'in_progress' | 'completed') {
  const supabase = await createClient();
  const from = view === 'today' ? startOfDay(new Date()) : startOfWeek(new Date());

  let query = supabase
    .from('orders')
    .select(
      'id, status, created_at, table_id, tables(number), order_station_status(bar_status, shisha_status), order_items(qty, is_new, note, products(name, category, price))'
    )
    .gte('created_at', from.toISOString())
    .order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getAdminOrdersDataset() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, created_at, closed_at, table_id, tables(number), order_station_status(bar_status, shisha_status), order_items(id, qty, note, products(id, name, category, price))'
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
