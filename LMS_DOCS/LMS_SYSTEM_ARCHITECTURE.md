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

### Routing and role guards
- `frontend/src/App.tsx` defines public, authenticated, instructor, and admin routes.
- `ProtectedRoute` enforces authenticated access.
- `RoleProtectedRoute` enforces role lists for instructor/admin surfaces.

### API layer
- `frontend/src/lib/api.ts` is the canonical fetch wrapper.
- It normalizes API errors into `ApiError`, always sends `credentials: "include"`, and reads backend base URL from `VITE_API_URL`.

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
- Audit logs: filterable audit event view for moderation actions.

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
- Prisma checks currently pass:
  - `npx prisma validate`
  - `npx prisma migrate status`

## 13. Roadmap
- Analytics: learner/instructor/admin operational dashboards.
- Payments: billing and subscription lifecycle.
- Chat/collaboration: course-level communication primitives.
- Infrastructure scaling: externalized rate-limit/cache, observability, and queue-backed event pipelines.
