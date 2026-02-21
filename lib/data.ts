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
  return data ?? [];
}

export async function getAvailableProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, is_available')
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAllProducts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, is_available, created_at')
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
      'id, status, table_id, created_at, tables(number), order_station_status(bar_status, shisha_status), order_items(id, qty, note, products(name, category, price))'
    )
    .gte('created_at', from.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getStationOrders(station: ProductCategory) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, table_id, created_at, tables(number), order_station_status(bar_status, shisha_status), order_items(id, qty, note, products(name, category, price))'
    )
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
      'id, status, created_at, table_id, tables(number), order_station_status(bar_status, shisha_status), order_items(qty, products(name, category, price))'
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
