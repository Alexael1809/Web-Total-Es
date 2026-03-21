# Workspace

## Overview

Plataforma de gestión de arbitraje P2P — aplicación full-stack completamente en español.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI
- **Auth**: JWT (jsonwebtoken + bcryptjs)
- **Charts**: Recharts
- **Forms**: react-hook-form + zod
- **Excel Export**: xlsx (SheetJS)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── p2p-manager/        # React frontend (Vite)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Authentication

- JWT tokens stored in localStorage under key `p2p_token`
- Admin seed: email `alexaelperdomo1809@gmail.com` / password `Server_1005$`
- Roles: `admin` (full access), `socio` (read-only personal stats)
- JWT secret: env var `JWT_SECRET` (defaults to internal secret)

## Database Tables

- `users` — Admin and Socio users
- `payment_methods` — Configurable payment platforms (Zinli, Facebank, etc.)
- `operations` — P2P arbitrage operations with auto-calculated net profit
- `receipts` — Payment proof screenshots linked to operations
- `distribution_reports` — Saved capital distribution calculations

## API Endpoints

- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `GET/POST /api/users` — User management (Admin)
- `DELETE /api/users/:id` — Delete user (Admin)
- `GET/POST /api/payment-methods` — Payment methods
- `DELETE /api/payment-methods/:id` — Delete payment method (Admin)
- `GET/POST /api/operations` — Operations CRUD
- `PUT/DELETE /api/operations/:id` — Update/delete operation
- `POST /api/operations/:id/receipts` — Upload receipt (multipart)
- `GET /api/dashboard/summary` — Daily analytics dashboard
- `POST /api/distribution/calculate` — Calculate capital distribution
- `GET/POST /api/distribution/reports` — Distribution reports
- `GET /api/reports/operations` — Operations report with grouping

## Net Profit Calculation Logic

1. `spreadUsdt = montoBruto / tasaDeCambio`
2. `comisionBancoUsdt = comisionBanco / tasaDeCambio`
3. `comisionServidorUsdt = comisionServidorEnUsdt ? comisionServidor : comisionServidor / tasaDeCambio`
4. `totalComisionesUsdt = comisionBancoUsdt + comisionBinance + comisionServidorUsdt`
5. `gananciaNetaUsdt = spreadUsdt - totalComisionesUsdt`
6. `gananciaNeta = gananciaNetaUsdt * tasaDeCambio`

## Uploads

Files uploaded to `artifacts/api-server/uploads/`, served at `/api/uploads/<filename>`

## Supabase Migration Note

When migrating to Supabase, replace the `DATABASE_URL` environment variable with the Supabase connection string. The Drizzle schema and all queries are compatible.
