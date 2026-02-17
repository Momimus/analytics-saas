# LMS Monorepo

Production-oriented LMS monorepo with role-based student, instructor, and admin workflows.

## Architecture Overview
- Monorepo with npm workspaces:
  - `frontend`: React SPA (routing, auth context, admin/instructor/student UI)
  - `backend`: Express API (middleware, routes, controllers/services, Prisma)
- Persistence: PostgreSQL via Prisma schema/migrations
- Infrastructure helpers: Docker Compose for local Postgres + pgAdmin

## Tech Stack
- Frontend: React 19, TypeScript, Vite, Tailwind
- Backend: Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL
- Quality: TypeScript strict mode, ESLint, Vitest, Testing Library (frontend), Supertest (backend)

## Repository Layout
- `frontend/`
- `backend/`
- `LMS_DOCS/`
- `docker-compose.yml`
- root `package.json` (workspace orchestration)

## Prerequisites
- Node.js 18+
- npm 10+
- PostgreSQL 16+ (or Docker Desktop for local containerized DB)

## Setup
1. Install dependencies:
   - `npm install`
2. Create env files:
   - `copy .env.example .env`
   - `copy backend\.env.example backend\.env`
   - `copy frontend\.env.example frontend\.env`
3. Start DB (if using Docker):
   - `docker compose up -d`
4. Apply migrations:
   - `npm -w backend run prisma -- migrate dev`

## Development Run
- Backend API:
  - `npm -w backend run dev`
  - Health check: `http://localhost:4000/health`
- Frontend app:
  - `npm -w frontend run dev`
  - App URL: `http://localhost:5173`

## Quality Gates
- Typecheck:
  - `npm run typecheck`
- Lint:
  - `npm run lint`
- Test:
  - `npm run test`
- Build:
  - `npm run build`

## Environment Variables
### Root `.env` (Docker Compose)
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `PGADMIN_DEFAULT_EMAIL`
- `PGADMIN_DEFAULT_PASSWORD`

### Backend `backend/.env`
- `DATABASE_URL`: Prisma datasource URL
- `JWT_SECRET`: JWT signing secret (required in production)
- `PORT`: API port (default `4000`)
- `ALLOWED_ORIGINS`: comma-separated allowed origins for CORS and mutating-origin checks
- `AUTH_COOKIE_NAME`: auth cookie name (default `auth_token`)
- `AUTH_COOKIE_SAMESITE`: `lax` or `none`
- `CSRF_COOKIE_NAME`: CSRF cookie name
- `CSRF_HEADER_NAME`: CSRF header name
- `ALLOW_BEARER_AUTH`: optional bearer-token fallback
- `RETURN_REGISTER_TOKEN`: optional dev response token toggle
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`
- `AUTH_LOGIN_ID_WINDOW_MS`
- `AUTH_LOGIN_ID_MAX`
- `AUTH_FORGOT_ID_WINDOW_MS`
- `AUTH_FORGOT_ID_MAX`
- `AUTH_RESET_ID_WINDOW_MS`
- `AUTH_RESET_ID_MAX`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` (seed helper)
- `ADMIN_RETURN_RESET_TOKEN` (admin reset endpoint behavior toggle)

### Frontend `frontend/.env`
- `VITE_API_URL`: backend origin (default fallback `http://localhost:4000`)

## Security Architecture Summary
- Cookie-first auth model with HTTP-only auth cookie.
- CSRF protection for mutating methods:
  - CSRF token issued by `GET /auth/csrf`.
  - Token must match CSRF cookie + request header.
- Origin allowlist check on mutating requests.
- Role-based access control on protected routes (`STUDENT`, `INSTRUCTOR`, `ADMIN`).
- Auth and password reset endpoints have in-memory rate limiting.
- Standardized JSON error contract (`ok`, `error`, `message`, optional `fieldErrors`).

## Role Model and Core Flows
- `STUDENT`:
  - Browse published catalog, request enrollment, consume lessons when enrollment is `ACTIVE`, track progress.
- `INSTRUCTOR`:
  - Manage owned courses/lessons, publish/unpublish, approve/revoke enrollment requests, request course deletion.
- `ADMIN`:
  - Full moderation over users/courses/enrollments/deletion requests, transfer admin role, review audit logs.
  - Admin UI is implemented at `/admin` with dedicated sections for users, instructors, courses, enrollments, inbox, and audit logs.

## Data and Lifecycle Notes
- Enrollment status lifecycle:
  - `REQUESTED -> ACTIVE -> REVOKED`
- Catalog visibility:
  - Published + non-archived courses.
- Deletion model:
  - Instructors submit deletion requests.
  - Admin approves/rejects.
  - Hard delete is admin-only and removes dependent lesson progress/enrollment data.
