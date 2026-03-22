# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start development server (http://localhost:3000)
npm run build      # Production build
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
```

No test suite is configured.

## Environment

Requires a `.env` file with:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client-side Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — server-side privileged operations
- `PRINTER_IP` / `PRINTER_PORT` — thermal printer (default: 192.168.0.31:9100)

## Architecture

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Supabase (Postgres + Auth + Realtime), Zod, shadcn/ui components.

### Role-Based Access

Four roles: `waiter`, `bar`, `shisha`, `admin`. After login, `roleDefaultRoute()` in `lib/auth.ts` redirects to the appropriate page. `requireRoles()` gates server pages/actions — unauthorized access redirects to login.

### Page → Role Mapping

| Route | Role |
|---|---|
| `/waiter` | waiter |
| `/station/bar` | bar |
| `/station/shisha` | shisha |
| `/admin/orders`, `/admin/products` | admin |

### Order Lifecycle

1. Waiter selects table + products → `createOrderAction` (server action)
   - Validates via Zod, checks product availability
   - Creates `orders` + `order_items` + `order_station_status` rows
   - Enqueues a print job
2. Station staff (bar/shisha) see orders on their board in near-realtime
3. `markStationDoneAction` updates `order_station_status`
4. When both stations are `done`, the order status transitions to `completed`

### Realtime Pattern

`StationBoardClient` (`components/shared/station-board-client.tsx`) subscribes to Postgres changes on `orders`, `order_items`, and `order_station_status` tables and triggers a full refresh on any change, with a 5-second polling fallback.

### Supabase Clients

Three client variants — use the right one:
- `lib/supabase/server.ts` — server components & server actions (cookie-based auth)
- `lib/supabase/client.ts` — browser/client components (singleton)
- `lib/supabase/admin.ts` — service role, bypasses RLS (admin operations only)

### Key Files

- `lib/auth.ts` — `requireRoles()`, `getCurrentUserProfile()`, `roleDefaultRoute()`
- `lib/data.ts` — all data-fetching functions (queries)
- `lib/types/database.ts` — full TypeScript schema for all tables
- `lib/format.ts` — BAM currency formatting, Bosnian locale datetime
- `app/actions/` — all server actions (auth, orders, admin, station)
- `supabase/migrations/` — 9 SQL migration files (schema, RLS, realtime)

### Shisha / Nargila Logic

There is intentionally only one shisha product ("Nargila"). Flavor selection is handled via the `note` field on `order_items` — waiters compose flavors as free text (e.g., "Swiss Ice + Lemon Blueberry"). The `shisha_flavors` table stores available flavor suggestions shown in the UI.

### Localization

UI text is in Bosnian/Croatian. Currency is BAM (Bosnian Convertible Mark), formatted via `lib/format.ts`.
