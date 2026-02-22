# Deployment

## Environment Variables
- Root `.env` (Docker helpers):
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`
- Backend `backend/.env`:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `PORT`
  - `ALLOWED_ORIGINS`
  - cookie/CSRF/rate-limit settings
  - optional admin seed variables
- Frontend `frontend/.env`:
  - `VITE_API_URL`

## Run Locally
1. Install dependencies:
   - `npm install`
2. Create env files from examples.
3. Optional local DB via Docker:
   - `docker compose up -d`
4. Run migrations:
   - `npm -w backend run prisma -- migrate dev`
5. Start dev servers:
   - `npm -w backend run dev`
   - `npm -w frontend run dev`

## Build Process
- Full build:
  - `npm run build`
- Full verification gate:
  - `npm run check`

## Production Overview
- Build frontend assets with Vite.
- Build backend TypeScript to `dist`.
- Set secure production env values (`JWT_SECRET`, origin/cookie settings).
- Run backend with process manager/container runtime.
- Serve frontend static build from CDN or web server.
