-- 0002_rls_policies.sql
alter table public.profiles enable row level security;
alter table public.tables enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_station_status enable row level security;

-- profiles
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (id = auth.uid() or public.has_role('admin'));

create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.has_role('admin'))
with check (id = auth.uid() or public.has_role('admin'));

-- tables
create policy "tables_read_all_authenticated"
on public.tables
for select
using (auth.uid() is not null);

-- products
create policy "products_read_available_or_admin"
on public.products
for select
using (is_available = true or public.has_role('admin'));

create policy "products_admin_insert"
on public.products
for insert
with check (public.has_role('admin'));

create policy "products_admin_update"
on public.products
for update
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "products_admin_delete"
on public.products
for delete
using (public.has_role('admin'));

-- orders
create policy "orders_waiter_admin_insert"
on public.orders
for insert
with check (
  (public.has_role('waiter') and created_by_user = auth.uid())
  or public.has_role('admin')
);

create policy "orders_select_by_role"
on public.orders
for select
using (
  public.has_role('admin')
  or public.has_role('bar')
  or public.has_role('shisha')
  or public.has_role('waiter')
);

create policy "orders_admin_update"
on public.orders
for update
using (public.has_role('admin'))
with check (public.has_role('admin'));

-- order_items
create policy "order_items_waiter_admin_insert"
on public.order_items
for insert
with check (
  public.has_role('admin')
  or exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.created_by_user = auth.uid()
      and public.has_role('waiter')
  )
);

create policy "order_items_select_by_role"
on public.order_items
for select
using (
  public.has_role('admin')
  or public.has_role('bar')
  or public.has_role('shisha')
  or public.has_role('waiter')
);

-- order_station_status
create policy "station_status_insert_waiter_admin"
on public.order_station_status
for insert
with check (
  public.has_role('admin')
  or exists (
    select 1 from public.orders o
    where o.id = order_id
      and o.created_by_user = auth.uid()
      and public.has_role('waiter')
  )
);

create policy "station_status_select_by_role"
on public.order_station_status
for select
using (
  public.has_role('admin')
  or public.has_role('waiter')
  or public.has_role('bar')
  or public.has_role('shisha')
);

create policy "station_status_update_bar_shisha_admin"
on public.order_station_status
for update
using (
  public.has_role('admin')
  or public.has_role('bar')
  or public.has_role('shisha')
)
with check (
  public.has_role('admin')
  or public.has_role('bar')
  or public.has_role('shisha')
);
