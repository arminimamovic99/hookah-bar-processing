-- Upsert requested shisha flavors with normalized capitalization.

with incoming(name) as (
  values
    ('Swiss'),
    ('Ice'),
    ('Menta'),
    ('Strong Menthol'),
    ('Lubenica'),
    ('Moskva'),
    ('Cherry Mint'),
    ('Peach Mint'),
    ('Kola'),
    ('Nar'),
    ('Borovnica'),
    ('Biskvit'),
    ('Grožđe'),
    ('Malina'),
    ('Ananas'),
    ('Lady Killer'),
    ('Baku'),
    ('Fresh'),
    ('Mi Amor')
),
updated as (
  update public.shisha_flavors f
  set
    name = i.name,
    is_available = true
  from incoming i
  where lower(f.name) = lower(i.name)
  returning lower(f.name) as name_lc
)
insert into public.shisha_flavors (name, is_available)
select
  i.name,
  true
from incoming i
where lower(i.name) not in (select name_lc from updated);
