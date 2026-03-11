# Analytics SaaS (Multi-tenant MVP)

Production-ready analytics SaaS baseline with workspace isolation.

## Stack
- Frontend: React 19 + TypeScript + Vite + Tailwind
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL + Prisma

## Multi-tenant capabilities
- Workspace-scoped data for `Product`, `Order`, `AnalyticsEvent`, and `AuditLog`
- Roles:
  - `SUPER_ADMIN`
  - `WORKSPACE_ADMIN`
  - `WORKSPACE_VIEWER`
- Workspace membership checks on all admin analytics/product/order/events APIs
- Workspace context from `x-workspace-id` header (preferred) or `ws` cookie
- Workspace switcher in app header (persisted in `localStorage`)
- Signup creates a new workspace automatically for the new user

## Core backend security/foundation
- Cookie JWT auth
- CSRF protection
- RBAC + workspace membership middleware
- Rate limiting (`/auth/*`, `/track`, `/admin/analytics/*`)
- Consistent error contract: `{ ok:false, error, message, fieldErrors? }`

## Setup
1. Install dependencies
   - `npm install`
2. Configure env files
   - `backend/.env.example` -> `backend/.env`
   - `frontend/.env.example` -> `frontend/.env`
3. Apply migrations
   - `npm --workspace backend run prisma -- migrate deploy`
4. Generate Prisma client
   - `npm --workspace backend run prisma -- generate`
5. Seed super admin
   - `npm --workspace backend run db:seed`
6. (Optional) Seed analytics sample data
   - `npm --workspace backend run seed:analytics`

## Run
- Full stack: `npm run dev`
- Backend only: `npm --workspace backend run dev`
- Frontend only: `npm --workspace frontend run dev`

## Workspace-scoped API routes
- `GET /me/workspaces`
- `POST /workspaces`
- `POST /workspaces/:id/members`
- `GET /admin/products`
- `POST /admin/products`
- `DELETE /admin/products/:id`
- `GET /admin/orders`
- `POST /admin/orders`
- `PATCH /admin/orders/:id/status`
- `GET /admin/analytics/overview`
- `GET /admin/analytics/trends`
- `GET /admin/analytics/activity`
- `POST /admin/events`
- `POST /track`

## Auth routes
- `POST /auth/register` (enabled; creates user + workspace)
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/csrf`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

## Production checklist
1. `npm install`
2. `npm --workspace backend run prisma -- generate`
3. `npm --workspace backend run prisma -- migrate deploy`
4. `npm --workspace backend run db:seed`
5. Build frontend/backend
   - `npm run build`
6. Start backend/frontend according to your deployment runtime
