# Dýrey Veterinary Hospital

A full-stack veterinary hospital website for Dýralæknaþjónusta Eyjafjarðar — with a public-facing site, online pet shop, appointment booking, and a password-protected staff admin portal.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `ADMIN_PASSWORD` — staff portal password (default: `staff1234`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (`artifacts/dyrey`), wouter routing, shadcn/ui, framer-motion, zustand (cart)
- API: Express 5 (`artifacts/api-server`), pino logging
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec`)
- Build: esbuild (CJS bundle)
- File uploads: Replit Object Storage (GCS-backed)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas (do not edit)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/db/src/schema/` — Drizzle schema definitions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/dyrey/src/pages/` — public pages
- `artifacts/dyrey/src/pages/admin/` — staff admin pages

## Product

**Public site:**
- Homepage with hero, services overview, featured products
- Online pet shop with category filtering and search
- Appointment booking form (service selection, date/time, pet info, owner info)
  - Services with `allowCustomDescription=true` prompt for a reason text
- Cart, order placement, order history
- My Appointments view

**Staff Admin Portal** (at `/admin`):
- Password login (default: `staff1234`, override with `ADMIN_PASSWORD` env var)
- Dashboard with appointment stats (pending, confirmed, completed, cancelled, today's count)
- Appointments: view all, filter by status, search, confirm/complete/cancel
- Services: full CRUD — name, description, duration, price, active toggle, custom-reason toggle
- Products: full CRUD — name, description, price, category, image upload (object storage), in-stock, featured toggles; new categories can be added inline
- Orders: view all, update status

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval codegen → typed React Query hooks + Zod schemas used by both client and server
- Admin auth uses a simple Bearer token derived from a staff password (no full auth system — suitable for internal staff use)
- Object storage for product images: presigned PUT URLs flow (client → API for URL → GCS directly)
- `isActive` on services controls visibility in customer booking form
- `allowCustomDescription` on services triggers a free-text "reason" field for the customer
- `customDescription` stored on appointments for staff to review

## Gotchas

- After editing `openapi.yaml`, always run `pnpm --filter @workspace/api-spec run codegen` — the script patches `lib/api-zod/src/index.ts` to avoid a duplicate-export conflict between orval's Zod schemas and its type folder
- `pnpm run typecheck` builds libs first (`tsc --build`) before checking leaf packages
- Never call service ports directly — all traffic goes through the shared proxy at `localhost:80`

## User preferences

- Icelandic names: "Dýrey" / "Dýralæknaþjónusta Eyjafjarðar"
- Color theme: light blue (hsl ~205, 70%, 55%) + clean white
- Google Calendar: deferred (user will connect later)
- Twilio SMS: skipped (email confirmation only)
- Admin password: environment-configurable, defaults to `staff1234`
