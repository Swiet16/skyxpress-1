# SkyXpress

SkyXpress is a logistics and parcel management web app with shipment tracking, quotes, invoices, and admin workflows.

## Run & Operate

- `pnpm install --frozen-lockfile` — install the workspace dependencies
- `pnpm --filter @workspace/skyxpress run dev` — run the SkyXpress Vite app
- `pnpm --filter @workspace/skyxpress run typecheck` — typecheck the app
- `PORT=20181 BASE_PATH=/ pnpm --filter @workspace/skyxpress run build` — create the production bundle
- The managed `artifacts/skyxpress: web` workflow supplies `PORT` and `BASE_PATH` automatically.
- Supabase-backed features use the configured `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment values.

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- React + Vite + Tailwind CSS
- Supabase client for authentication, data, storage, and realtime features
- ExcelJS, jsPDF, and html2canvas for manifest and invoice exports

## Where things live

- `artifacts/skyxpress/src/App.tsx` — application routes and main shell
- `artifacts/skyxpress/src/components/` — shipment, invoice, tracking, and admin UI
- `artifacts/skyxpress/src/integrations/supabase/` — Supabase client and generated types
- `artifacts/skyxpress/.replit-artifact/artifact.toml` — preview and static publishing configuration

## Architecture decisions

- The app remains a frontend-only Vite artifact and keeps its existing Supabase backend.
- The production artifact is served statically from `dist/public` with an SPA rewrite to `index.html`.
- The root preview path is `/`, so the published site opens directly at the app root.

## Product

- Public pages for services, quotes, contact, tracking, and company information
- Authenticated user dashboard for parcel requests, shipment status, and invoices
- Admin tools for parcel approval, pricing, users, requests, and invoice generation

## User preferences

- Keep the imported project structure and existing stack intact; prefer focused fixes over migrations.

## Gotchas

- Run builds with `PORT` and `BASE_PATH` set when invoking Vite directly; the managed artifact workflow injects both automatically.
- Production publishing is configured in `artifacts/skyxpress/.replit-artifact/artifact.toml`, not in the root `.replit` deployment section.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
