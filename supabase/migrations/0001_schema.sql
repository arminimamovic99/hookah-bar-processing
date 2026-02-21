-- 0001_schema.sql
create extension if not exists "pgcrypto";

create type public.app_role as enum ('waiter', 'bar', 'shisha', 'admin');
create type public.product_category as enum ('drink', 'shisha');
create type public.order_status as enum ('new', 'in_progress', 'completed');
create type public.station_status as enum ('pending', 'done');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'waiter',
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.product_category not null,
  price numeric(10, 2) not null check (price >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.tables(id) on delete restrict,
  status public.order_status not null default 'new',
  created_by_user uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  qty integer not null default 1 check (qty > 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_station_status (
  order_id uuid primary key references public.orders(id) on delete cascade,
  bar_status public.station_status not null default 'pending',
  shisha_status public.station_status not null default 'pending',
  updated_at timestamptz not null default now()
);

create index if not exists orders_table_id_idx on public.orders(table_id);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists products_category_idx on public.products(category);

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = required_role
  );
$$;

create or replace function public.sync_order_status_from_station()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = case
    when new.bar_status = 'done' and new.shisha_status = 'done' then 'completed'::public.order_status
    when new.bar_status = 'done' or new.shisha_status = 'done' then 'in_progress'::public.order_status
    else 'new'::public.order_status
  end
  where id = new.order_id;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sync_order_status on public.order_station_status;
create trigger trg_sync_order_status
before insert or update on public.order_station_status
for each row
execute function public.sync_order_status_from_station();

create or replace function public.enforce_station_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role public.app_role;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select role into user_role from public.profiles where id = auth.uid();

  if user_role = 'bar' then
    if new.shisha_status <> old.shisha_status then
      raise exception 'Bar role can only update bar_status';
    end if;
  elsif user_role = 'shisha' then
    if new.bar_status <> old.bar_status then
      raise exception 'Shisha role can only update shisha_status';
    end if;
  elsif user_role = 'admin' then
    null;
  else
    raise exception 'Role is not allowed to update station status';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_station_update on public.order_station_status;
create trigger trg_enforce_station_update
before update on public.order_station_status
for each row
execute function public.enforce_station_update_permissions();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();
