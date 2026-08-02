# SkyXpress International Courier & Cargo

## Project overview
SkyXpress is a full-stack air cargo / courier management web app built with **React + Vite + TypeScript** backed by **Supabase** (Postgres + Auth + RLS).

### Key features
- Public landing, services, tracking, quote, network, and about pages
- Partner and admin dashboards with role-gated access
- Manifest management (create, edit, lock, export to Excel/PDF, bulk status updates)
- Parcel management with CSV import
- Invoice tracking, pricing manager, partner management

## How to run
```
pnpm install          # install all workspace deps (first time only)
# The "artifacts/skyxpress: web" workflow starts the app automatically.
# Dev server runs on PORT assigned by Replit (vite config reads process.env.PORT).
```

## Tech stack
| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS, shadcn/ui, React Query, React Router v6 |
| Backend DB | Supabase (Postgres) |
| Auth | Supabase Auth |
| Export | ExcelJS, jsPDF |
| Monorepo | pnpm workspaces |

## Environment variables required
| Variable | Where to set |
|----------|-------------|
| `VITE_SUPABASE_URL` | Replit Secrets (or `.env.local`) |
| `VITE_SUPABASE_ANON_KEY` | Replit Secrets (or `.env.local`) |

## Role model (in `profiles.role`)
| Role | Access |
|------|--------|
| `admin` | Full access — all manifests, users, rates, partners |
| `staff` / `developer` | All manifests + operational views |
| `partner` | Own manifests and parcels only (enforced by RLS) |
| `user` | Own parcels and tracking only |

## Manifest RLS
Run `supabase-rls-manifests.sql` in the Supabase SQL Editor to apply row-level security:
- Partners see only rows where `partner_user_id = auth.uid()`
- Admins/staff see all rows
- The `get_user_role()` RPC function is used inside all policies

## Key files
- `artifacts/skyxpress/src/` — all app source
- `artifacts/skyxpress/src/utils/manifestStorage.ts` — Supabase CRUD for manifests
- `artifacts/skyxpress/src/components/ManifestStock.tsx` — manifest list, admin partner filter
- `artifacts/skyxpress/src/components/AdminDashboard.tsx` — admin shell
- `artifacts/skyxpress/src/components/PartnerDashboard.tsx` — partner shell
- `supabase-rls-manifests.sql` — RLS policy SQL (run once in Supabase SQL Editor)

## User preferences
- Partner filter added to admin Manifest Stock view (dropdown + parcel count badges)
