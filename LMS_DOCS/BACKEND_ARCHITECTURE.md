# Backend Architecture

## Folder Structure
- `backend/src/index.ts`: app bootstrap, auth/admin endpoints, middleware wiring
- `backend/src/routes/*`: courses, student, instructor
- `backend/src/controllers/*`: shared controllers for course/lesson route group
- `backend/src/services/*`: Prisma/business logic
- `backend/src/middleware/*`: auth, async wrapper, error handling
- `backend/src/utils/*`: URL/assert helpers
- `backend/src/validation/*`: payload validators (profile currently)

## Security Model
- Auth: JWT in HTTP-only cookie (plus bearer fallback in middleware).
- `requireAuth` always refreshes role from DB.
- Role gates via `requireRole`.
- Mutating origin check in global middleware (`POST/PATCH/PUT/DELETE`).

### Security/Consistency Findings
- CSRF protection is origin-only (no anti-CSRF token pattern).
- Error format is not unified:
  - `HttpError` path returns `{ error }`
  - profile validation returns `{ ok:false, error:"VALIDATION_ERROR", message, fieldErrors }`
- `POST /auth/register` returns a JWT in body but does not set auth cookie, while login does set cookie.

## Authorization Model
- Roles: `STUDENT`, `INSTRUCTOR`, `ADMIN`
- Instructor routes are scoped with ownership checks in services.
- Admin is intentionally allowed to bypass instructor ownership constraints in selected service calls.
- Public course routes are constrained to published + non-archived data.

## Route Surface (Current)

### Auth + Session (`index.ts`)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /me`
- `PATCH /me`

### Public/Shared Course Routes (`routes/courses.ts`)
- `GET /courses`
- `GET /courses/:id/public`
- `GET /courses/:id` (auth required)
- `GET /courses/:id/lessons` (auth required)
- `POST /courses/:id/lessons` (INSTRUCTOR/ADMIN)
- `POST /courses` (INSTRUCTOR/ADMIN)

### Student (`routes/student.ts`)
- `POST /courses/:id/request-access` (canonical)
- `POST /courses/:id/enroll` (deprecated alias)
- `GET /my/enrollments`
- `GET /my/courses`
- `GET /my/progress`
- `GET /lessons/:id`
- `POST /lessons/:id/complete`
- `POST /lessons/:id/uncomplete`

### Instructor (`routes/instructor.ts`)
- `GET /instructor/requests`
- `GET /instructor/courses`
- `GET /instructor/courses/:id`
- `PATCH /instructor/courses/:id`
- `POST /instructor/courses`
- `GET /instructor/courses/:id/lessons`
- `POST /instructor/courses/:id/lessons`
- `PATCH /instructor/lessons/:id`
- `DELETE /instructor/lessons/:id`
- `POST /instructor/courses/:id/publish`
- `POST /instructor/courses/:id/unpublish`
- `GET /instructor/courses/:id/requests`
- `POST /instructor/enrollments/:id/approve`
- `POST /instructor/enrollments/:id/revoke`
- `GET /instructor/courses/:id/students`
- `POST /instructor/courses/:id/delete-request`

### Admin (`index.ts`)
- `POST /admin/users/:id/role`
- `DELETE /admin/users/:id`
- `GET /admin/delete-requests`
- `POST /admin/delete-requests/:id/approve`
- `POST /admin/delete-requests/:id/reject`
- `DELETE /admin/courses/:id/hard-delete`

## Frontend Usage Notes
- Admin routes are currently not consumed by frontend routes/pages.
- `POST /courses/:id/enroll` is not used by frontend and marked deprecated.
- `POST /courses/:id/lessons` appears unused by frontend (instructor UI uses `/instructor/courses/:id/lessons`).
- `GET /courses/:id` appears currently unused by frontend course detail page (which uses `/public` + `/lessons`).

## Validation Coverage Snapshot
- Strong:
  - profile payload (`validation/profileValidation.ts`)
  - course create/update string lengths + image URL constraints
  - instructor lesson URL validation (`assertHttpOrUploadUrl`)
- Weaker/inconsistent:
  - `lessonController` route path `POST /courses/:id/lessons` uses looser optional URL handling
  - mixed validation response shapes

## Performance/Structure Risks
- Multiple requests on dashboard (`/instructor/courses` + `/instructor/requests`) are expected and bounded.
- No obvious N+1 in instructor requests aggregation (single transaction query set).
- Hardcoded response DTO shapes are mostly intentional but not formally centralized across all route groups.
