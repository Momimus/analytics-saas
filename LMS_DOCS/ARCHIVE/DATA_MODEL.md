# Data Model (Prisma)

## Enums
- `Role`: `ADMIN`, `INSTRUCTOR`, `STUDENT`
- `EnrollmentStatus`: `REQUESTED`, `ACTIVE`, `REVOKED`
- `DeletionRequestStatus`: `PENDING`, `APPROVED`, `REJECTED`

## Core Models

### User
- Identity: `id`, `email`, `passwordHash`, `role`
- Profile: `fullName`, `phone`, `phoneCountry`, `phoneE164`, `address`
- Relations:
  - `enrollments`
  - `progress` (`LessonProgress`)
  - `createdCourses`
  - `deletionRequests` / `deletionDecisions`

### Course
- Metadata: `title`, `description`, `category`, `level`, `imageUrl`
- Lifecycle: `isPublished`, `archivedAt`
- Ownership: `createdById` (nullable)
- Relations: `lessons`, `enrollments`, `deletionRequests`

### Lesson
- `courseId`, `title`, `videoUrl`, `pdfUrl`, `createdAt`
- Relations: `course`, `progress`

### Enrollment
- Unique pair: `(userId, courseId)`
- State: `status` (`REQUESTED`/`ACTIVE`/`REVOKED`)
- Timestamps: `createdAt`, `updatedAt`

### LessonProgress
- Unique pair: `(userId, lessonId)`
- Completion marker: `completedAt`

### PasswordResetToken
- `tokenHash`, `expiresAt`, `usedAt`
- Linked to `User`

### DeletionRequest
- Course deletion workflow entity
- `reason`, `status`, `adminNote`
- `requestedById`, `decidedById`
- `createdAt`, `decidedAt`

## Integrity and Lifecycle Rules
- Published catalog queries exclude `archivedAt != null`.
- Student active learning queries are based on `Enrollment.status = ACTIVE`.
- Soft delete/archive: admin approval sets `Course.archivedAt` and unpublishes.
- Hard delete path removes lessons, progress, enrollments, and course.

## Validation-Relevant Fields (Current)
- Profile fields validated in backend validator:
  - `fullName` length/content
  - `address` max length
  - `phone` + `phoneCountry` strict parse and normalization
- Course metadata validated in route/controller layer:
  - title and optional text max lengths
  - `imageUrl` direct image URL checks
- Instructor lesson URLs validated for `http/https` or upload placeholder path.

## Known Modeling/Behavior Notes
- `User.phone` and `User.phoneE164` both exist; current backend writes normalized E.164 into both when phone is present.
- `Course.createdById` is nullable (`onDelete: SetNull`), while admin user deletion currently blocks instructor deletion when owned courses exist.
