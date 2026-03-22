-- Allow waiter to update station status (used when appending to existing table order).

drop policy if exists "station_status_update_waiter" on public.order_station_status;
create policy "station_status_update_waiter"
on public.order_station_status
for update
using (public.has_role('waiter'))
with check (public.has_role('waiter'));

create or replace function public.enforce_station_update_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role public.app_role;
begin
  -- Service role is used by trusted backend/server jobs.
  if auth.role() = 'service_role' then
    return new;
  end if;

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
  elsif user_role = 'waiter' then
    null;
  else
    raise exception 'Role is not allowed to update station status';
  end if;

  return new;
end;
$$;
