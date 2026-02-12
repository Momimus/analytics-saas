# LMS Monorepo

LMS monorepo with:
- `frontend`: React 19 + TypeScript + Vite + Tailwind
- `backend`: Express + TypeScript + Prisma + PostgreSQL

## Prerequisites
- Node.js 18+
- Docker Desktop (optional, for local Postgres + pgAdmin)

## Project Structure
- `frontend/`
- `backend/`
- npm workspaces are configured at root (`package.json`)

## Setup
1. Create env files:
   - `copy .env.example .env`
   - `copy backend\.env.example backend\.env`
2. Start database (optional if you already have Postgres running):
   - `docker compose up -d`
3. Install dependencies:
   - `npm install`
4. Apply Prisma migrations:
   - `npm -w backend run prisma -- migrate dev`

## Run (Development)
- Backend:
  - `npm -w backend run dev`
  - Health: `http://localhost:4000/health`
- Frontend:
  - `npm -w frontend run dev`
  - App: `http://localhost:5173`

## Build / Checks
- Typecheck all:
  - `npm run typecheck`
- Lint (TS no-emit checks):
  - `npm run lint`
- Build all:
  - `npm run build`

## Auth Model (Cookie-First)
- Login sets an HTTP-only auth cookie on backend origin.
- Frontend API calls use `credentials: "include"`.
- Protected backend routes use `requireAuth`.
- `GET /me` resolves current user from cookie session.

## Roles
- `STUDENT`
- `INSTRUCTOR`
- `ADMIN`

Admin APIs exist for role assignment, deletion-request decisions, and hard delete operations. A dedicated Admin UI panel is still pending.

## Enrollment Workflow (Manual Access)
Enrollment uses status-based access:
- `REQUESTED`: student requested access
- `ACTIVE`: approved by instructor/admin
- `REVOKED`: access removed/rejected

Student lesson/content access requires `ACTIVE`.

## Course Visibility and Deletion
- Catalog/listing uses published, non-archived courses.
- Soft delete behavior uses course archiving (`Course.archivedAt`) via admin-approved deletion requests.
- Instructors submit deletion requests; they do not hard-delete courses directly.
- Admin-only hard delete removes dependent data (including lesson progress).

## Security Notes (Dev vs Prod)
- `JWT_SECRET`:
  - Production: required (startup fails if missing)
  - Dev/Test: dev warns loudly when missing
- CORS and CSRF checks share one origin allowlist:
  - `ALLOWED_ORIGINS` in `backend/.env` (comma-separated)

## Useful Endpoints
- Health/Auth:
  - `GET /health`
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET /me`
- Courses:
  - `GET /courses`
  - `GET /courses/:id/public` (public-safe detail)
  - `GET /courses/:id` (auth-protected detail)
- Student:
  - `POST /courses/:id/request-access`
  - `GET /my/enrollments`
  - `GET /my/courses`
  - `GET /my/progress`
- Instructor:
  - `/instructor/courses/*` (course/lesson management, publish/unpublish, request handling)

## Environment
- Root `.env` is used by Docker services.
- `backend/.env` configures API + Prisma.
- Default Postgres URL:
  - `postgresql://postgres:postgres@localhost:5432/lms?schema=public`
