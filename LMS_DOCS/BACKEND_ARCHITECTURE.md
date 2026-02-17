# Backend Architecture

## Folder Structure
- `backend/src/index.ts`: bootstrap, middleware wiring, auth/session endpoints, route mounting
- `backend/src/routes/*`: route groups for courses, student, instructor, admin
- `backend/src/controllers/*`: controller layer (shared course/lesson handlers)
- `backend/src/services/*`: domain rules and Prisma operations
- `backend/src/middleware/*`: auth, CSRF, rate limit, async wrapper, error handling
- `backend/src/utils/*`: error helpers, request metadata, URL validators
- `backend/src/validation/*`: payload validators
- `backend/prisma/schema.prisma`: source of truth DB schema

## Security Model
- Auth is JWT via HTTP-only cookie by default.
- Optional bearer-token fallback exists behind `ALLOW_BEARER_AUTH=true`.
- `requireAuth` resolves current user from DB and blocks suspended accounts.
- `requireRole` enforces RBAC at route boundaries.
- CSRF protection is implemented using cookie/header token matching middleware.
- Mutating-origin validation is enforced globally for `POST/PATCH/PUT/DELETE`.
- Rate limiting is applied to auth-related endpoints.

## Authorization Model
- Roles: `STUDENT`, `INSTRUCTOR`, `ADMIN`.
- Instructor routes enforce ownership checks (with admin bypass where intentionally allowed).
- Admin routes are fully role-gated at router level.

## Route Surface (Current)

### Auth + Session (`src/index.ts`)
- `GET /health`
- `GET /auth/csrf`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /me`
- `PATCH /me`

### Courses (`src/routes/courses.ts`)
- `GET /courses`
- `GET /courses/:id/public`
- `GET /courses/:id`
- `GET /courses/:id/lessons`
- `POST /courses/:id/lessons`
- `POST /courses`

### Student (`src/routes/student.ts`)
- `POST /courses/:id/request-access`
- `POST /courses/:id/enroll` (deprecated alias)
- `GET /my/enrollments`
- `GET /my/courses`
- `GET /my/progress`
- `GET /lessons/:id`
- `POST /lessons/:id/complete`
- `POST /lessons/:id/uncomplete`

### Instructor (`src/routes/instructor.ts`)
- course listing/detail/create/update
- publish/unpublish
- lesson CRUD
- enrollment request listing + approve/revoke
- students listing
- deletion request submission

### Admin (`src/routes/admin.ts`)
- metrics/summary
- instructor oversight (list/detail/courses/students)
- users moderation (list/filter, suspend/activate, role, transfer-admin, reset, delete)
- courses moderation (list/filter, publish/unpublish/archive, hard-delete)
- deletion request moderation (list/approve/reject)
- enrollments moderation (list/status/grant/revoke)
- audit log listing

## Layering Notes
- Main architecture follows routes -> controllers -> services -> prisma.
- Admin and some instructor modules use routes -> services directly for pragmatic, low-overhead handling where controller indirection adds little value.

## Validation Coverage Snapshot
- Profile update validation includes structured `fieldErrors`.
- Course and lesson operations validate required fields and URL constraints.
- Enrollment status transitions are validated centrally with lifecycle guard utilities.

## Stability Notes
- Typecheck, lint, tests, and builds are currently passing.
- Prisma configuration uses `prisma.config.ts` (deprecated package.json Prisma config removed).
