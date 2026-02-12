# LMS Monorepo

Minimal LMS scaffold with a React (Vite) frontend, a Node.js + Express (TypeScript) backend, and Postgres via Docker.

## Prereqs
- Node.js 18+
- Docker Desktop (optional, for Postgres + pgAdmin)

## Setup
1. Create env files:
   - `copy .env.example .env`
   - `copy backend\.env.example backend\.env`

2. Start Postgres (and optional pgAdmin):
   - `docker compose up -d`

3. Install dependencies:
   - `npm install`

4. Initialize the database schema:
   - `npm --workspace backend run prisma migrate dev --name init`

## Run
- Backend API:
  - `npm --workspace backend run dev`
  - Health check: `http://localhost:4000/health`

- Frontend:
  - `npm --workspace frontend run dev`
  - App: `http://localhost:5173`

## Endpoints
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /me` (requires `Authorization: Bearer <token>`)

## Notes
- Default Postgres URL (backend): `postgresql://postgres:postgres@localhost:5432/lms?schema=public`
- pgAdmin is available at `http://localhost:5050` (use the pgAdmin env vars in `.env`).
- Secrets live in `.env` files and are ignored by git.
- For cookie-auth mutation protection, configure `CSRF_ALLOWED_ORIGINS` in `backend/.env` (comma-separated allowed origins).
