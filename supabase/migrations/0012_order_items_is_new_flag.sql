-- Mark newly appended order items so stations can highlight them.

alter table public.order_items
add column if not exists is_new boolean not null default false;

create index if not exists order_items_order_id_is_new_idx
on public.order_items(order_id, is_new);
