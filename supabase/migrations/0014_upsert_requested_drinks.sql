-- Upsert requested drink menu (name, price, subcategory).

with incoming(name, price, drink_subcategory) as (
  values
    ('Kafa', 2.5, 'warm'),
    ('Caj', 2.5, 'warm'),
    ('Kafa s mlijekom', 3.0, 'warm'),
    ('Nes 3 u 1', 3.5, 'warm'),
    ('Cappuccino', 3.5, 'warm'),
    ('Topla cokolada', 5.0, 'warm'),
    ('Coca cola', 3.5, 'cold'),
    ('Fanta', 3.5, 'cold'),
    ('Schweppes', 3.5, 'cold'),
    ('Sprite', 3.5, 'cold'),
    ('Cockta', 3.5, 'cold'),
    ('Richard', 3.5, 'cold'),
    ('Orangina', 4.0, 'cold'),
    ('Malt', 4.0, 'cold'),
    ('Red bull', 5.0, 'cold'),
    ('Exotic', 3.0, 'cold'),
    ('Mineralna voda', 2.5, 'cold'),
    ('Prirodna voda', 2.5, 'cold'),
    ('Voda s okusom', 3.0, 'cold'),
    ('Cedevita', 3.0, 'cold'),
    ('Ledeni caj', 3.5, 'cold'),
    ('Dvojni c', 3.5, 'cold'),
    ('Prirodni sok', 3.5, 'cold'),
    ('Limunada', 4.0, 'cold'),
    ('Cijedjena narandza', 5.0, 'cold'),
    ('Citrus mix', 6.0, 'cold'),
    ('Ledena kafa', 5.0, 'cold'),
    ('Somersby', 4.0, 'cold'),
    ('Monin limunada', 5.0, 'cold'),
    ('Late macchiato', 3.5, 'warm')
),
updated as (
  update public.products p
  set
    category = 'drink',
    price = i.price,
    drink_subcategory = i.drink_subcategory::public.drink_subcategory,
    is_available = true
  from incoming i
  where lower(p.name) = lower(i.name)
  returning lower(p.name) as name_lc
)
insert into public.products (name, category, price, drink_subcategory, is_available)
select
  i.name,
  'drink'::public.product_category,
  i.price,
  i.drink_subcategory::public.drink_subcategory,
  true
from incoming i
where lower(i.name) not in (select name_lc from updated);
