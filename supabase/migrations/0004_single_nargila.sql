-- 0004_single_nargila.sql
-- Enforce exactly one generic shisha product: "Nargila".

do $$
declare
  keeper_id uuid;
begin
  -- Ensure at least one shisha product exists.
  if not exists (select 1 from public.products where category = 'shisha') then
    insert into public.products (name, category, price, is_available)
    values ('Nargila', 'shisha', 12.00, true);
  end if;

  -- Pick one keeper row.
  select id
  into keeper_id
  from public.products
  where category = 'shisha'
  order by created_at asc
  limit 1;

  -- Point historical order items from duplicate shisha products to keeper.
  update public.order_items oi
  set product_id = keeper_id
  where oi.product_id in (
    select p.id
    from public.products p
    where p.category = 'shisha'
      and p.id <> keeper_id
  );

  -- Remove duplicate shisha products.
  delete from public.products p
  where p.category = 'shisha'
    and p.id <> keeper_id;

  -- Normalize the keeper row.
  update public.products
  set name = 'Nargila'
  where id = keeper_id;
end $$;

-- At most one shisha row in products.
create unique index if not exists products_one_shisha_only_idx
on public.products ((category))
where category = 'shisha';

-- If category is shisha, name must be Nargila.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_shisha_name_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
    add constraint products_shisha_name_check
    check (category <> 'shisha' or name = 'Nargila');
  end if;
end $$;
