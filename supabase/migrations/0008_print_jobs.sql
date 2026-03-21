-- Print queue table for LAN thermal printer worker.

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  table_number text not null,
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'printing', 'printed', 'failed')),
  type text not null default 'label',
  error_message text,
  created_at timestamptz not null default now(),
  printed_at timestamptz
);

create index if not exists print_jobs_status_created_at_idx
on public.print_jobs(status, created_at asc);

alter table public.print_jobs enable row level security;

drop policy if exists "print_jobs_waiter_admin_insert" on public.print_jobs;
create policy "print_jobs_waiter_admin_insert"
on public.print_jobs
for insert
with check (public.has_role('waiter') or public.has_role('admin'));

drop policy if exists "print_jobs_waiter_admin_select" on public.print_jobs;
create policy "print_jobs_waiter_admin_select"
on public.print_jobs
for select
using (public.has_role('waiter') or public.has_role('admin'));

drop policy if exists "print_jobs_admin_update" on public.print_jobs;
create policy "print_jobs_admin_update"
on public.print_jobs
for update
using (public.has_role('admin'))
with check (public.has_role('admin'));
