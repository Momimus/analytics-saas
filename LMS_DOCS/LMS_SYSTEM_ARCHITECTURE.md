# LMS System Architecture

## 1. Executive Overview
This LMS is a production-oriented npm-workspaces monorepo with a React frontend and an Express + Prisma backend. It supports three roles (`STUDENT`, `INSTRUCTOR`, `ADMIN`) with RBAC, cookie-based auth, CSRF protection, rate limiting, enrollment lifecycle controls, deletion moderation, and audit logging.

## 2. Monorepo Architecture Diagram (Text-Based)
```txt
LMS (root workspace)
|- frontend/ (React + Vite SPA)
|  |- src/App.tsx (route map + role guards)
|  |- src/components/AppShell.tsx (shared shell/navigation)
|  |- src/context/auth.tsx (session hydration + auth state)
|  |- src/lib/api.ts (API client + CSRF token retry)
|  `- src/pages/* (student/instructor/admin feature pages)
|- backend/ (Express + Prisma API)
|  |- src/index.ts (bootstrap + middleware stack + auth routes)
|  |- src/routes/* (student/instructor/admin/course route groups)
|  |- src/controllers/* (course/lesson controller layer)
|  |- src/services/* (domain logic + Prisma access)
|  `- prisma/schema.prisma (database schema)
`- LMS_DOCS/ (architecture and milestone docs)
```

## 3. Frontend Architecture
### App shell
- `frontend/src/components/AppShell.tsx` provides global layout, role-aware navigation, pending-request indicators, and shared top-level UX behavior.
- `frontend/src/components/ErrorBoundary.tsx` wraps the app root to prevent white-screen crashes and provides fallback recovery actions.
- Shared UI primitives under `frontend/src/components/ui` provide consistent dropdown/date/dialog interactions aligned with the glass theme.

### Routing and role guards
- `frontend/src/App.tsx` defines public, authenticated, instructor, and admin routes.
- `ProtectedRoute` enforces authenticated access.
- `RoleProtectedRoute` enforces role lists for instructor/admin surfaces.
- Unknown routes fall back to a dedicated `NotFound404` page (`path="*"`).
- Role mismatch for authenticated users renders a dedicated `Forbidden403` page; unauthenticated users continue to redirect to `/login`.

### API layer
- `frontend/src/lib/api.ts` is the canonical fetch wrapper.
- It normalizes API errors into `ApiError`, always sends `credentials: "include"`, and reads backend base URL from `VITE_API_URL`.
- `frontend/src/components/common/InlineErrorState.tsx` is used for user-friendly API failure display with retry actions on key pages.

### UI primitives and overlays
- `Select`: custom listbox/dropdown primitive replacing native selects across admin/instructor/student filters.
- `DateInput`: custom calendar popover replacing native date inputs, displaying `DD/MM/YYYY` while preserving internal `YYYY-MM-DD` state values.
- `Dialog`: shared modal primitive for overlays, with focus trap, escape/click-outside close, and consistent backdrop styling.
- `SelectPopover`: compatibility wrapper that now delegates to `Select` to preserve existing usage with minimal churn.
- `AdminFilterBar`: premium toolbar structure with helper text, active-filter count, and reset actions.
- `AdminTable`: premium data-grid wrapper with optional sticky headers, zebra rows, density control, applied-filter chips, and polished pagination shell.
- `AdminTable` responsive contract:
  - default `table` mode for desktop/tablet.
  - optional `stack` mode for mobile (`responsiveMode="stack"` + `mobileStack`) on dense moderation surfaces.
- `StatCard`: supports loading skeleton presentation for dashboard metric blocks.
- `ToastBanner`: consistent visual feedback surface for success/error messaging.
- Compact density contract:
  - shared control heights use compact sizing (`h-9`) through `frontend/src/lib/uiClasses.ts`
  - dashboard/detail cards use tighter spacing and reduced visual bulk (`StatCard`, `GlassCard`)
  - `AdminTable` defaults to compact row/header density, compact filter chips, and compact pagination controls
  - `AdminFilterBar` uses tighter panel/header/control spacing for lower vertical whitespace
  - `Select` trigger width is container-driven (no hardcoded minimum), so constrained contexts like pagination remain stable
  - pagination layout is wrap-safe on small screens: page-size selector (`w-16 sm:w-20`) and nav buttons are non-overlapping clusters
  - admin mobile navigation uses the global AppShell drawer as primary; `AdminSectionNav` is hidden on small screens to avoid duplicate nav bands
- dashboard metric grids follow mobile-first breakpoints (`1 -> 2 -> 4`) for better phone/tablet density
- mobile action ergonomics:
  - dense row actions use compact menus on small screens; desktop keeps inline buttons.
- Micro-interaction polish:
  - row-selected visual highlighting in admin table surfaces
  - sticky-header scroll shadow feedback when table content moves
  - removable per-filter chips (in addition to clear-all) without changing filter logic contracts

### CSRF handling
- Mutating requests trigger CSRF-token acquisition via `GET /auth/csrf`.
- Token is sent in `x-csrf-token` header.
- One automatic retry is attempted on `403 Invalid CSRF token`.

## 4. Backend Architecture
### Layered pattern (routes -> controllers -> services -> prisma)
- Predominant flow:
  - `routes` define endpoint contracts and auth/role gates.
  - `controllers` handle request/response mapping (course/lesson modules).
  - `services` enforce business rules and persistence operations.
  - Prisma client (`lib/prisma.ts`) performs DB access.
- Note: some route groups (especially admin/instructor modules) call services directly when controller abstraction is unnecessary.

### Middleware stack
From `backend/src/index.ts`:
1. CORS allowlist middleware
2. JSON parser
3. mutating-origin validation (`POST/PUT/PATCH/DELETE`)
4. CSRF middleware (`createCsrfProtection`)
5. route mounts (`/courses`, student routes, `/instructor`, `/admin`)
6. centralized error handler (`errorHandler`)

### Error contract
- `backend/src/utils/httpError.ts` standardizes API error payloads:
  - `ok: false`
  - `error` (error code)
  - `message`
  - optional `fieldErrors`

## 5. Authentication Flow
1. Register/login endpoints validate credentials and issue JWT.
2. JWT is stored in an HTTP-only auth cookie.
3. Frontend calls `GET /me` to hydrate session.
4. `requireAuth` validates token and resolves user/role from DB.
5. Suspended users are blocked on auth-protected flows.

## 6. Student Flow (catalog -> request -> approval -> progress)
1. Student browses catalog (`GET /courses`).
2. Requests enrollment (`POST /courses/:id/request-access`).
3. Instructor/Admin moderation sets enrollment state (`ACTIVE` or `REVOKED`).
4. Student can access course lessons and lesson detail only with `ACTIVE` enrollment.
5. Completion tracking is updated via lesson complete/uncomplete endpoints.
6. Progress summary is returned by `GET /my/progress`.

## 7. Instructor Flow (course lifecycle -> moderation -> approvals)
1. Instructor creates and updates owned courses.
2. Manages lessons (create/update/delete).
3. Publishes/unpublishes courses.
4. Reviews pending enrollment requests and approves/revokes access.
5. Submits course deletion requests for admin decision.

## 8. Admin Flow (users, courses, enrollments, inbox, audit logs)
- User moderation: list/filter users, suspend/activate, role changes, transfer admin, delete, issue reset.
- Course moderation: list/filter, publish/unpublish/archive, hard-delete, deletion request decisions.
- Enrollment moderation: list/filter, status transitions, direct grant/revoke actions.
- Inbox: consolidated pending enrollment/deletion queues.
- Shared admin table UX on users/courses/enrollments/inbox:
  - filter bars with search and scoped dropdown/date filters
  - skeleton loading rows during fetch
  - explicit empty states with direct reload actions
- Audit logs:
  - quick filters for action, actor id, target type, and date range
  - detail modal with who/what/when/why/network fields
  - metadata JSON viewer with diff-like before/after rendering when present
  - copy actions for core identifiers (log/actor/target/request/trace, when present)

## 9. Database Model Overview
Main entities in `backend/prisma/schema.prisma`:
- `User`
- `Course`
- `Lesson`
- `Enrollment`
- `LessonProgress`
- `PasswordResetToken`
- `DeletionRequest`
- `AuditLog`

Enums:
- `Role`
- `EnrollmentStatus`
- `DeletionRequestStatus`

## 10. Security Model
- JWT auth via HTTP-only cookie (optional bearer fallback via env toggle).
- CSRF double-submit cookie protection on mutating requests.
- Origin allowlist enforcement for mutating requests.
- In-memory rate limiting on auth-related endpoints.
- RBAC gates across student/instructor/admin route groups.
- Suspension checks in auth and protected requests.

## 11. Audit & Moderation Model
- Admin and instructor moderation actions emit audit logs through `writeAuditLog`.
- Enrollment transitions are guarded by `assertEnrollmentTransitionAllowed`.
- Deletion requests are moderation-gated (pending -> approved/rejected).
- Additional safeguards prevent unsafe admin-account and instructor-deletion actions.

## 12. Current Stability Status
- Workspace checks currently pass:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run check`
- Prisma checks currently pass:
  - `npm --workspace backend exec prisma validate`
- CI enforcement:
  - `.github/workflows/ci.yml` runs on push and pull requests
  - Executes `npm ci`, `npm run check`, and backend Prisma validation

## 13. Roadmap
- Analytics: learner/instructor/admin operational dashboards.
- Payments: billing and subscription lifecycle.
- Chat/collaboration: course-level communication primitives.
- Infrastructure scaling: externalized rate-limit/cache, observability, and queue-backed event pipelines.
