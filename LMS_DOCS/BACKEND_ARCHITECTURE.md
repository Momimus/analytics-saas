# Backend Architecture

## Folder Structure
- `backend/src/index.ts`: app setup, middleware wiring, auth/admin endpoints
- `backend/src/routes/*`: route modules (`courses`, `student`, `instructor`)
- `backend/src/controllers/*`: shared/public route handlers
- `backend/src/services/*`: business logic and Prisma access
- `backend/src/middleware/*`: auth, async wrapper, error handler
- `backend/src/utils/*`: shared validation/error helpers
- `backend/prisma/schema.prisma`: data model
- `backend/prisma/migrations/*`: migration history

## Route Grouping
- `/courses`:
  - public catalog and public-safe detail
  - auth-protected detail/lessons for role-aware access
- student routes:
  - request access
  - enrollments, my courses, my progress
  - lesson complete/incomplete
- `/instructor`:
  - course and lesson CRUD (role/ownership constrained)
  - requests listing and status decisions
  - students roster
  - publish/unpublish
- admin routes (in `index.ts`):
  - role updates
  - deletion request decisions
  - hard delete

## Middleware System
- `requireAuth`:
  - reads cookie/bearer token
  - verifies JWT
  - resolves live role from DB
- `requireRole([...])`:
  - role authorization guard
- CSRF/origin guard:
  - mutating methods validated against allowed origins
- centralized error handler:
  - typed `HttpError` + fallback 500

## Role-Based Access Control
- Student-only operations guarded with `requireRole([STUDENT])`.
- Instructor operations guarded with `requireRole([INSTRUCTOR, ADMIN])`.
- Ownership checks in services for instructor-scoped data.
- Admin bypass allowed where intentional.

## Enrollment Lifecycle
`Enrollment.status`:
- `REQUESTED` -> request submitted
- `ACTIVE` -> approved access
- `REVOKED` -> rejected/retracted

State transitions currently occur via:
- Student request endpoint (upsert to `REQUESTED`)
- Instructor/Admin approve/revoke endpoints

## Instructor Requests Aggregation Endpoint
- `GET /instructor/requests`
- Optional `limit` query
- Returns:
  - `totalPending`
  - `latestPendingAt`
  - `requests[]` including minimal `course` + `user` fields
- Ownership constrained for instructors; admin can view all pending requests.

## Security Summary
- Auth: JWT + HTTP-only cookie
- Session usage: frontend sends `credentials: include`
- CORS + CSRF origin checks use allowlist configuration
- Role and ownership controls enforced in route + service layers
- URL validation exists for direct image URL constraints
