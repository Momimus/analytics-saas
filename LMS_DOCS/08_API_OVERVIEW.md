# API Overview

## API Structure
- Base API served by Express app in `backend/src/index.ts`.
- Route groups:
  - `backend/src/routes/courses.ts`
  - `backend/src/routes/student.ts`
  - `backend/src/routes/instructor.ts`
  - `backend/src/routes/admin.ts`

## Endpoint Categories
- Auth:
  - register, login, logout
  - forgot/reset password
  - session profile (`/me`)
  - CSRF token (`/auth/csrf`)
- Student:
  - request access
  - my enrollments/courses/progress
  - lesson read/complete/uncomplete
- Instructor:
  - own courses and lessons CRUD
  - publish/unpublish
  - request approvals/revocations
  - deletion requests
  - roster and request views
- Admin:
  - metrics/summary
  - user moderation
  - course moderation
  - enrollment moderation
  - deletion decision workflow
  - audit logs

## Request/Response Lifecycle
1. Frontend calls endpoint with credentials.
2. Backend validates security middleware.
3. Route/service executes domain logic.
4. DB read/write via Prisma.
5. JSON response returned:
  - success payloads
  - standardized error payload (`ok`, `error`, `message`, optional `fieldErrors`)
