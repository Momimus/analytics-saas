# Analytics SaaS Baseline

Production-ready SaaS foundation built with React + Vite + TypeScript (frontend) and Express + TypeScript + Prisma + PostgreSQL (backend).

This baseline is admin-only:
- Public registration is disabled.
- Only `ADMIN` role is supported.
- Seed creates or updates a single admin account from env vars.

## Stack
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL + Prisma ORM

## Included Foundation
- Cookie auth + `/auth/*` endpoints
- RBAC middleware
- CSRF protection
- Error contract (`{ error, message, fieldErrors? }`)
- Rate limiting middleware
- Admin shell and generic admin pages
- Shared UI primitives and API client

## Setup
1. Install dependencies:
   - `npm install`
2. Copy env files:
   - `.env.example` to `.env`
   - `backend/.env.example` to `backend/.env`
   - `frontend/.env.example` to `frontend/.env`
3. Configure admin seed env in `backend/.env`:
   - `ADMIN_EMAIL=admin@example.com`
   - `ADMIN_PASSWORD=change-me-now`
   - `ADMIN_NAME=Platform Admin`
4. Start PostgreSQL (optional via Docker):
   - `docker compose up -d`
5. Apply Prisma migrations to a fresh database:
   - `npm --workspace backend run prisma -- migrate deploy`
6. Seed the admin user:
   - `npm --workspace backend run db:seed`

## Run
- Full app (backend + frontend): `npm run dev`
- Backend only: `npm --workspace backend run dev`
- Frontend only: `npm --workspace frontend run dev`

## Scripts
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Test: `npm run test`
- Build: `npm run build`
- Full check: `npm run check`

## Default URLs
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`

## Core Routes
- Frontend:
  - `/login`
  - `/forgot-password`
  - `/reset-password`
  - `/profile`
  - `/admin/analytics`
  - `/admin/users`
  - `/admin/audit-logs`
- Backend:
  - `/auth/csrf`
  - `/auth/register` (disabled, returns 404)
  - `/auth/login`
  - `/auth/logout`
  - `/auth/forgot-password`
  - `/auth/reset-password`
  - `/me` (GET/PATCH)
  - `/admin/users`
  - `/admin/audit-logs`
