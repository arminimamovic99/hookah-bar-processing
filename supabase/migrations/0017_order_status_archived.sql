alter type public.order_status add value if not exists 'archived';

create or replace function public.sync_order_status_from_station()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
  set status = case
    when status = 'archived'::public.order_status then status
    when new.bar_status = 'done' and new.shisha_status = 'done' then 'completed'::public.order_status
    when new.bar_status = 'done' or new.shisha_status = 'done' then 'in_progress'::public.order_status
    else 'new'::public.order_status
  end
  where id = new.order_id;

  new.updated_at = now();
  return new;
end;
$$;
