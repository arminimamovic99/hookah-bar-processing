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

insert into public.products (name, category, price, is_available)
values
  ('Water', 'drink', 2.50, true),
  ('Cola', 'drink', 3.50, true),
  ('Fresh Orange Juice', 'drink', 5.00, true),
  ('Lemon Mint', 'drink', 4.50, true),
  ('Nargila', 'shisha', 12.00, true)
on conflict do nothing;
