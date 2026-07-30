# SkyXpress

SkyXpress is a logistics and parcel management web app with shipment tracking, quotes, invoices, manifest stock management, and admin workflows.

## Run & Operate

- `PORT=20181 BASE_PATH=/ pnpm --filter @workspace/skyxpress run dev` — run the SkyXpress Vite app
- `pnpm --filter @workspace/skyxpress run typecheck` — typecheck the app
- `PORT=20181 BASE_PATH=/ pnpm --filter @workspace/skyxpress run build` — create the production bundle
- The managed `SkyXpress` workflow supplies `PORT=20181` and `BASE_PATH=/` automatically.
- Supabase-backed features use the configured `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment values.

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- React + Vite + Tailwind CSS
- Supabase client for authentication, data, storage, and realtime features
- ExcelJS, jsPDF, and html2canvas for manifest and invoice exports

## Where things live

- `artifacts/skyxpress/src/App.tsx` — application routes and main shell
- `artifacts/skyxpress/src/components/ManifestStock.tsx` — bulk manifest manager with status tracking
- `artifacts/skyxpress/src/utils/manifestStorage.ts` — manifest CRUD + `ManifestStockEntry` type (includes `manifestStatus`)
- `artifacts/skyxpress/src/utils/bulkManifestPDF.ts` — PDF export with status badge printed on every manifest
- `artifacts/skyxpress/src/integrations/supabase/` — Supabase client and generated types
- `artifacts/skyxpress/.replit-artifact/artifact.toml` — preview and static publishing configuration

## Architecture decisions

- The app remains a frontend-only Vite artifact and keeps its existing Supabase backend.
- Manifest stock is stored in localStorage with Supabase as an optional sync layer.
- Manifest statuses (live / pending / picked_up / in_transit / out_for_delivery / delivered / returned) are stored as `manifestStatus` on `ManifestStockEntry` and persisted to localStorage.
- Status updates support both single-manifest (inline dropdown) and bulk (checkbox select + toolbar) workflows.
- The production artifact is served statically from `dist/public` with an SPA rewrite to `index.html`.

## Product

- Public pages for services, quotes, contact, tracking, and company information
- Authenticated user dashboard for parcel requests, shipment status, and invoices
- Admin tools for parcel approval, pricing, users, requests, and invoice generation
- Manifest Stock with per-manifest status badges (live/pending/picked_up/in_transit/out_for_delivery/delivered/returned)
- Bulk status update: select many manifests with checkboxes and update all at once
- PDF export includes the manifest status as a styled colour-coded badge in the header

## User preferences

- Keep the imported project structure and existing stack intact; prefer focused fixes over migrations.

## Gotchas

- Run builds with `PORT` and `BASE_PATH` set when invoking Vite directly; the managed artifact workflow injects both automatically.
- Production publishing is configured in `artifacts/skyxpress/.replit-artifact/artifact.toml`, not in the root `.replit` deployment section.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
