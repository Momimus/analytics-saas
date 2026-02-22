# User Flows

## Admin Flow
- Open admin dashboard and moderation sections.
- Manage:
  - users (suspend/activate/role changes)
  - courses (publish/unpublish/archive/delete)
  - enrollments (approve/revoke/grant/remove)
  - deletion requests (approve/reject)
- Review audit logs for operational history.

## Instructor Flow
- Create and edit owned courses.
- Add/update/delete lessons.
- Publish or unpublish owned courses.
- Review student requests and approve/revoke access.
- Submit course deletion requests for admin review.

## Student Flow
- Browse course catalog.
- Request access to courses.
- Access course content after approval.
- Mark lessons complete/uncomplete.
- Track learning progress in personal views.

## Enrollment Lifecycle
1. Student submits access request (`REQUESTED`).
2. Instructor/admin approves (`ACTIVE`) or removes (`REVOKED`).
3. Active enrollment allows learning access.
4. Revoked enrollment removes access.
