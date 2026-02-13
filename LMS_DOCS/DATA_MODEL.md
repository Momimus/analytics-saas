# Data Model (Prisma)

## Core Enums
- `Role`: `ADMIN`, `INSTRUCTOR`, `STUDENT`
- `EnrollmentStatus`: `REQUESTED`, `ACTIVE`, `REVOKED`
- `DeletionRequestStatus`: `PENDING`, `APPROVED`, `REJECTED`

## Core Models
### User
- Identity/auth: `email`, `passwordHash`, `role`
- Profile: `fullName`, `phone`, `phoneCountry`, `phoneE164`, `address`
- Relations:
  - enrollments
  - lesson progress
  - created courses
  - deletion requests

### Course
- Content metadata: `title`, `description`, `category`, `level`, `imageUrl`
- Lifecycle: `isPublished`, `archivedAt`
- Ownership: `createdById` (nullable relation to `User`)
- Relations:
  - lessons
  - enrollments
  - deletion requests

### Lesson
- Belongs to course
- Fields: `title`, `videoUrl`, `pdfUrl`
- Relations:
  - progress rows

### Enrollment
- Join table between `User` and `Course`
- Unique key: `(userId, courseId)`
- Status state machine:
  - `REQUESTED`, `ACTIVE`, `REVOKED`
- Timestamps: `createdAt`, `updatedAt`

### LessonProgress
- Join table between `User` and `Lesson`
- Completion tracking via `completedAt`
- Unique key: `(userId, lessonId)`

### PasswordResetToken
- One-time password reset token storage
- Tracks expiry and usage

### DeletionRequest
- Course deletion approval workflow
- Fields:
  - `reason`, `status`, `adminNote`
  - `requestedById`, `decidedById`
  - `createdAt`, `decidedAt`

## Relationship Summary
- One `User` can create many `Course`s.
- One `Course` has many `Lesson`s.
- `Enrollment` links many `User` <-> many `Course`.
- `LessonProgress` links many `User` <-> many `Lesson`.
- `DeletionRequest` belongs to a `Course`, with requesting/deciding users.

## Soft Delete Logic
- Course soft delete is implemented as `Course.archivedAt` set to timestamp.
- Archived courses are excluded from student/instructor list queries where intended.
- Publish flag is set false when approved for archive.

## Deletion Request Flow
1. Instructor submits deletion request for owned course.
2. Admin approves/rejects request.
3. Approval sets archive metadata on course (soft delete behavior).
4. Admin hard delete endpoint exists for permanent deletion.
