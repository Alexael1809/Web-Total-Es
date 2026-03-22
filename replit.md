# Workspace

## Overview

Plataforma de gestión de arbitraje P2P — aplicación full-stack completamente en español.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Supabase PostgreSQL + Drizzle ORM
- **Auth**: Supabase Auth (signInWithPassword) + JWT propio para roles (jsonwebtoken)
- **Storage**: Supabase Storage (bucket `receipts` — público para lectura)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI
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

- **Login**: Supabase Auth (`supabase.auth.signInWithPassword`) → genera JWT propio con rol
- JWT tokens almacenados en localStorage bajo clave `p2p_token`
- Admin: `alexaelperdomo1809@gmail.com` / `Server_1005$`
- Socio: `carlos.socio@demo.com` / `Socio_2025$`
- Roles: `admin` (acceso completo), `socio` (estadísticas personales)
- Supabase UIDs vinculados en columna `supabase_uid` de la tabla `users`

## Supabase Integration

- **SUPABASE_URL**: URL del proyecto Supabase
- **SUPABASE_ANON_KEY**: Clave anon/public (46 chars)
- **SUPABASE_SERVICE_ROLE_KEY**: Clave service_role JWT (219 chars, empieza con eyJ)
- **SUPABASE_DATABASE_URL**: Connection string PostgreSQL directo
- Backend usa `@supabase/supabase-js` con service_role para bypassear RLS
- Storage bucket `receipts` es público (lectura sin auth), escritura solo desde servidor

## Database Tables

- `users` — Usuarios Admin y Socio; tiene columna `supabase_uid` para vincular con Supabase Auth
- `payment_methods` — Plataformas de pago configurables (Zinli, Facebank, etc.)
- `currencies` — Monedas (VES, COP, USD, PAB)
- `operations` — Operaciones P2P; tiene `status_ciclo` (abierta/cerrada), `tasa_compra`, `tasa_venta`
- `receipts` — Comprobantes de pago (URLs de Supabase Storage, organizados por tipo enviado/recibido)
- `distribution_reports` — Cálculos de distribución de capital guardados

## Key Formulas

- `tasa_de_cambio` = multiplicador spread (ej. 1.08 = 8% ganancia)
- `ganancia_bruta_usdt = monto_bruto × (tasa - 1)`
- Las 3 comisiones (banco, binance, servidor) están en USDT
- `ganancia_neta_usdt = ganancia_bruta - comBanco - comBinance - comServidor`
- Modo T/C: `tasa = tasa_venta / tasa_compra`
- Cerrar Ciclo: `ganancia_real_usdt = monto_final_usdt - monto_bruto`

## File Uploads (Receipts)

- Archivos subidos a Supabase Storage bucket `receipts`
- Organizados por operación: `op-{id}/{timestamp}-{random}.{ext}`
- URLs públicas: `https://{project}.supabase.co/storage/v1/object/public/receipts/...`
- Eliminación limpia: borra de Storage + DB

## API Endpoints

- `POST /api/auth/login` — Login (via Supabase Auth)
- `GET /api/auth/me` — Usuario actual
- `GET/POST /api/users` — Gestión de usuarios (Admin)
- `DELETE /api/users/:id` — Eliminar usuario (Admin + Supabase Auth)
- `GET/POST /api/payment-methods` — Métodos de pago
- `DELETE /api/payment-methods/:id` — Eliminar método (Admin)
- `GET/POST /api/currencies` — Monedas
- `DELETE /api/currencies/:id` — Eliminar moneda
- `GET/POST /api/operations` — CRUD operaciones
- `PUT/DELETE /api/operations/:id` — Actualizar/eliminar operación
- `POST /api/operations/:id/cerrar-ciclo` — Cerrar ciclo
- `POST /api/operations/:id/receipts` — Subir comprobante (→ Supabase Storage)
- `DELETE /api/operations/:id/receipts/:receiptId` — Eliminar comprobante
- `GET /api/dashboard/summary` — Dashboard analítico
- `POST /api/distribution/calculate` — Calcular distribución de capital
- `GET/POST /api/distribution/reports` — Reportes de distribución
- `GET /api/reports/operations` — Reporte de operaciones
