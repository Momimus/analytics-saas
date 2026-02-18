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

## UI Components
- Shared theme-aligned UI primitives are used for interactive controls:
  - `Select` for dropdowns (`frontend/src/components/ui/Select.tsx`)
  - `DateInput` for date selection (`frontend/src/components/ui/DateInput.tsx`)
  - `Dialog` for modal overlays (`frontend/src/components/ui/Dialog.tsx`)
- Premium surface patterns:
  - filter/action toolbars with active-filter indicators
  - table enhancements (sticky header, zebra/hover states, applied-filter chips, polished pagination)
  - micro table interactions (row selected highlight, sticky-header scroll shadow, removable filter chips)
  - metric/stat card skeleton states for dashboard loading
  - consistent toast and confirmation/dialog visuals (clean SVG status icons and smooth entrance transition)
- UI Density (Compact Mode):
  - shared compact control sizing (`h-9`) for select/date/input surfaces
  - tighter cards (`StatCard`/`GlassCard`) with reduced padding and spacing rhythm
  - compact table defaults in `AdminTable` (row/header padding, chips, pagination controls)
  - compact filter/toolbars via `AdminFilterBar` with reduced vertical footprint
  - pagination width contract: page-size `Select` respects container width (no hardcoded min width), with `w-16 sm:w-20` sizing in table pagination
  - pagination no-overlap contract: page-size selector + Prev/Next + page indicator are wrapped as non-colliding clusters on narrow screens
  - mobile admin nav strategy: global drawer remains primary on mobile while `AdminSectionNav` is desktop/tablet only
  - mobile-first dashboard grids: metric cards use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` style patterns for cleaner small-screen layouts
- Accessibility guarantees for these primitives:
  - keyboard navigation support
  - escape-to-close and click-outside-close for overlays/popovers
  - focus trapping for dialogs and focus restore on close
- New dropdown/date fields should use shared components above (or `SelectPopover` compatibility wrapper) instead of native controls.

## Responsive UI Rules
- Card density:
  - mobile-first spacing (`p-3`) with `sm:p-4` for larger breakpoints.
  - avoid fixed card heights; let content define vertical size.
- Data list responsiveness:
  - dense admin tables support mobile stack rendering via shared `AdminTable` (`responsiveMode="stack"` + `mobileStack`).
  - desktop keeps columnar table rendering unchanged.
- Action ergonomics:
  - mobile uses compact action menus for dense moderation rows.
  - desktop keeps inline action buttons.
- Pagination contract:
  - page-size selector must respect container width.
  - wrap-safe clusters prevent page-size/Prev/Next overlap on narrow screens.

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
- Full local gate (ordered):
  - `npm run check`

## CI Pipeline
- GitHub Actions workflow: `.github/workflows/ci.yml`
- Triggers on push and pull requests
- Runs:
  - `npm ci`
  - `npm run check`
  - `npm --workspace backend exec prisma validate`
- CI uses deterministic non-secret defaults for required envs and does not run DB migrations.

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

## Routing and Access UX
- Unknown frontend routes render a dedicated `404` page (`Page not found`) with guided actions.
- Authenticated users who fail role checks now see a dedicated `403` access-denied view with current/required role context.
- Unauthenticated access to protected routes still redirects to `/login` (unchanged auth behavior).
- A global React `ErrorBoundary` wraps the app root and provides a crash fallback with:
  - reload-page action
  - dashboard shortcut
  - optional dev-only stack detail view

## Error Handling UX
- `404` Not Found page for unknown SPA routes with quick navigation actions.
- `403` Access Denied view for authenticated role-mismatch scenarios.
- Global React error boundary fallback to avoid full white-screen crashes.
- Reusable inline API error state with:
  - friendly status-aware messaging
  - explicit retry action
  - optional error code/details display
- Applied on admin table surfaces (users, courses, enrollments, inbox, audit logs) and student courses loading view.

## Role Model and Core Flows
- `STUDENT`:
  - Browse published catalog, request enrollment, consume lessons when enrollment is `ACTIVE`, track progress.
- `INSTRUCTOR`:
  - Manage owned courses/lessons, publish/unpublish, approve/revoke enrollment requests, request course deletion.
- `ADMIN`:
  - Full moderation over users/courses/enrollments/deletion requests, transfer admin role, review audit logs.
  - Admin UI is implemented at `/admin` with dedicated sections for users, instructors, courses, enrollments, inbox, and audit logs.

## Admin UX Highlights
- Admin tables (`/admin/users`, `/admin/courses`, `/admin/enrollments`, `/admin/inbox`) now share:
  - filter/search bars (role/status/date filters where relevant)
  - loading skeleton states
  - explicit empty states with reload actions
- Audit logs (`/admin/audit-logs`) support:
  - quick filters (action, actor id, target type, date range)
  - detailed event modal with who/what/when/why/network context
  - readable before/after change view when metadata contains diff data
  - one-click copy actions for log, actor, target, request, and trace identifiers (when present)

## Data and Lifecycle Notes
- Enrollment status lifecycle:
  - `REQUESTED -> ACTIVE -> REVOKED`
- Catalog visibility:
  - Published + non-archived courses.
- Deletion model:
  - Instructors submit deletion requests.
  - Admin approves/rejects.
  - Hard delete is admin-only and removes dependent lesson progress/enrollment data.
