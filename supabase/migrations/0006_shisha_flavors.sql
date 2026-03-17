-- Add shisha flavors catalog with RLS.

create table if not exists public.shisha_flavors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists shisha_flavors_available_idx
on public.shisha_flavors(is_available);

alter table public.shisha_flavors enable row level security;

drop policy if exists "shisha_flavors_read_available_or_admin" on public.shisha_flavors;
create policy "shisha_flavors_read_available_or_admin"
on public.shisha_flavors
for select
using (is_available = true or public.has_role('admin'));

drop policy if exists "shisha_flavors_admin_insert" on public.shisha_flavors;
create policy "shisha_flavors_admin_insert"
on public.shisha_flavors
for insert
with check (public.has_role('admin'));

drop policy if exists "shisha_flavors_admin_update" on public.shisha_flavors;
create policy "shisha_flavors_admin_update"
on public.shisha_flavors
for update
using (public.has_role('admin'))
with check (public.has_role('admin'));

drop policy if exists "shisha_flavors_admin_delete" on public.shisha_flavors;
create policy "shisha_flavors_admin_delete"
on public.shisha_flavors
for delete
using (public.has_role('admin'));
