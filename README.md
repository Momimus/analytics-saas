# LMS Monorepo

Role-based LMS built with React + Express + Prisma.

## Quick Start
1. `npm install`
2. Copy env files:
   - `.env.example -> .env`
   - `backend/.env.example -> backend/.env`
   - `frontend/.env.example -> frontend/.env`
3. Optional DB via Docker: `docker compose up -d`
4. Run backend: `npm -w backend run dev`
5. Run frontend: `npm -w frontend run dev`

## Quality Commands
- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run check`

## Documentation Index
- `LMS_DOCS/01_OVERVIEW.md`
- `LMS_DOCS/02_ARCHITECTURE.md`
- `LMS_DOCS/03_FRONTEND.md`
- `LMS_DOCS/04_BACKEND.md`
- `LMS_DOCS/05_DATABASE.md`
- `LMS_DOCS/06_AUTH_SECURITY.md`
- `LMS_DOCS/07_USER_FLOWS.md`
- `LMS_DOCS/08_API_OVERVIEW.md`
- `LMS_DOCS/09_UI_SYSTEM.md`
- `LMS_DOCS/10_DEPLOYMENT.md`
