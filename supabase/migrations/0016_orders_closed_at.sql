-- Keep completed orders visible for waiter until table is explicitly closed.
alter table public.orders
add column if not exists closed_at timestamptz;

create index if not exists orders_closed_at_idx on public.orders(closed_at);
