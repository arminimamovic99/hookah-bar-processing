# Shisha Bar Ordering (MVP)

Next.js 15 + TypeScript + Tailwind + shadcn/ui-style components + Supabase Auth/Postgres/Realtime/RLS.

## Features

- Waiter flow (`/waiter`): pick table, add drinks/shisha with qty + note, submit order, see active table orders.
- Shisha customization: only one shisha product exists in DB (`Nargila`), and the exact guest flavor mix is captured in item note (e.g. `swiss ice`, `lemon blueberry`).
- Station flow (`/station/bar`, `/station/shisha`): realtime incoming orders per station, mark station done.
- Admin flow (`/admin/products`, `/admin/orders`): manage products, availability, today/week orders, status filters, totals.
- Auth + role-aware access control via `profiles.role`.

## Environment

Copy `.env.example` to `.env.local` and fill values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Install + Run

```bash
npm install
npm run dev
```

App routes:

- `/login`
- `/waiter`
- `/station/bar`
- `/station/shisha`
- `/admin/products`
- `/admin/orders`

## Supabase SQL (Exact Order)

Run these SQL files in order:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`
3. `supabase/migrations/0003_realtime.sql`
4. `supabase/migrations/0004_single_nargila.sql`
5. `supabase/seed.sql`

## Auth + Role Setup

1. Create users in Supabase Auth (Email/Password).
2. Set their roles in `public.profiles`:

```sql
update public.profiles set role = 'admin' where email = 'admin@demo.com';
update public.profiles set role = 'waiter' where email = 'waiter@demo.com';
update public.profiles set role = 'bar' where email = 'bar@demo.com';
update public.profiles set role = 'shisha' where email = 'shisha@demo.com';
```

## RLS Notes

- Waiter: can create orders and read orders.
- Bar/Shisha: can read orders and update station status (trigger enforces per-station column restrictions).
- Admin: full product CRUD + read all orders.

## Realtime Notes

Realtime subscriptions refresh station and waiter screens on:

- `orders` changes
- `order_items` changes
- `order_station_status` changes

Order completion is automatic from trigger logic when both stations are `done`.

## Validation + UX

- Zod validation for login, order payloads, station updates, and product CRUD.
- Basic loading and error feedback on action buttons/forms.
- Mobile-first waiter interface and tablet/desktop-friendly station/admin views.
