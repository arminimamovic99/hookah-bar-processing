-- Demo seed: tables + products
insert into public.tables (number, is_active)
values
  ('1', true),
  ('2', true),
  ('3', true),
  ('4', true),
  ('5', true)
on conflict (number) do update
set is_active = excluded.is_active;

insert into public.products (name, category, price, is_available, drink_subcategory)
values
  ('Water', 'drink', 2.50, true, 'cold'),
  ('Cola', 'drink', 3.50, true, 'cold'),
  ('Fresh Orange Juice', 'drink', 5.00, true, 'cold'),
  ('Lemon Mint', 'drink', 4.50, true, 'warm'),
  ('Nargila', 'shisha', 12.00, true, null)
on conflict do nothing;
