# SkyXpress International Courier & Cargo

A full-featured logistics management platform for international shipping operations.

## Overview

SkyXpress is a React + Vite web application backed by Supabase for authentication and data. It supports parcel tracking, manifest management, invoice generation, and admin dashboards for staff/admin roles.

## Architecture

- **Frontend**: React 19 + Vite, TailwindCSS v4, shadcn/ui components
- **Auth & Database**: Supabase (external — requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
- **Routing**: React Router v6 (`BrowserRouter`)
- **Workspace**: pnpm monorepo at `artifacts/skyxpress/`

## Required Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

Set these as Replit Secrets so the app can connect to the database.

## Key Features

- Public pages: Home, Services, Track, Quote, Network, About, Contact, Terms
- Auth: Sign In / Sign Up via Supabase Auth
- User dashboard: parcel submission, status tracking, payment invoices
- Admin/Staff dashboard:
  - User management
  - Parcel management & approvals
  - Manifest stock (create, lock, status tracking, Excel/PDF export)
  - Pricing manager
  - Dashboard charts

## Manifest Status Flow

Manifests track shipments through six statuses:
`pending` → `picked_up` → `in_transit` → `out_for_delivery` → `delivered` / `returned`

Bulk status updates available in ManifestStock component.

## PDF/Excel Features

- **Bill of Airway (AWB) PDF**: `src/components/SkyXpressAWBInvoice.tsx` — stubbed jsPDF (graceful error until firewall allows the package)
- **Bulk Manifest PDF**: `src/utils/bulkManifestPDF.ts`
- **Excel Export**: `src/utils/manifestExport.ts` (uses exceljs)

## Supabase SQL Setup

The ManifestStock component (`src/components/ManifestStock.tsx`) contains an embedded SQL schema viewer. Run the shown SQL in Supabase → SQL Editor to enable manifest saving with sequence IDs.

## User Preferences

- Keep `// @ts-nocheck` on complex components — visual/functional parity matters more than zero TS errors
- Stubs for jsPDF, html2canvas, bwip-js are wired in `vite.config.ts` — these show graceful errors rather than crashing
