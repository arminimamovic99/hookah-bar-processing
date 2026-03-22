-- Set active service tables to 1..31.

insert into public.tables (number, is_active)
select gs::text, true
from generate_series(1, 31) as gs
on conflict (number) do update
set is_active = true;

update public.tables
set is_active = false
where number ~ '^[0-9]+$'
  and number::int > 31;
