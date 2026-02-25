-- Add drink subcategories (cold/warm) and require subcategory for new drink inserts.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'drink_subcategory') then
    create type public.drink_subcategory as enum ('cold', 'warm');
  end if;
end $$;

alter table public.products
add column if not exists drink_subcategory public.drink_subcategory;

create index if not exists products_drink_subcategory_idx
on public.products(drink_subcategory)
where category = 'drink';

create or replace function public.enforce_drink_subcategory_for_new_drinks()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.category = 'shisha' then
    new.drink_subcategory = null;
    return new;
  end if;

  if tg_op = 'INSERT' and new.category = 'drink' and new.drink_subcategory is null then
    raise exception 'drink_subcategory is required for new drink products';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_products_drink_subcategory_guard on public.products;
create trigger trg_products_drink_subcategory_guard
before insert or update on public.products
for each row
execute function public.enforce_drink_subcategory_for_new_drinks();
