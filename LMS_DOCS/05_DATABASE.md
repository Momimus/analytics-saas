# Database

## Engine
- PostgreSQL
- Prisma schema: `backend/prisma/schema.prisma`

## Main Tables
- `User`
  - account identity, role, profile fields, suspension state
- `Course`
  - title/content metadata, publish/archive state, creator
- `Lesson`
  - per-course lesson content links
- `Enrollment`
  - student-course membership with lifecycle status
- `LessonProgress`
  - per-student completion state
- `AuditLog`
  - moderation and security-relevant action history
- `DeletionRequest`
  - instructor deletion requests and admin decisions
- `PasswordResetToken`
  - password reset flow tokens

## Key Relationships
- `User` (creator) -> many `Course`
- `Course` -> many `Lesson`
- `User` <-> `Course` through `Enrollment`
- `User` <-> `Lesson` through `LessonProgress`
- `Course` -> many `DeletionRequest`

## Lifecycle Examples
- Enrollment lifecycle:
  - `REQUESTED -> ACTIVE -> REVOKED`
- Course deletion lifecycle:
  - instructor creates `DeletionRequest`
  - admin sets `APPROVED` or `REJECTED`
  - approved flow archives/hard-deletes according to endpoint used
