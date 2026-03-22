-- Ensure service has tables 1..34 available.

insert into public.tables (number, is_active)
select gs::text, true
from generate_series(1, 34) as gs
on conflict (number) do update
set is_active = excluded.is_active;
