# Admin Milestone Preparation

## Current System State Summary
- Cookie-auth-first architecture is active and used by frontend (`credentials: include`).
- Role model and ownership checks are broadly in place for student/instructor/admin operations.
- Enrollment workflow (`REQUESTED -> ACTIVE -> REVOKED`) is implemented end-to-end.
- Instructor request management is implemented with aggregated API + frontend badge UX.
- Profile validation is now strict with backend field-level errors.

Overall state before Admin UI: **usable foundation with targeted consistency gaps**.

## Admin Readiness Analysis

### Already Implemented (Backend)
- `POST /admin/users/:id/role`
- `DELETE /admin/users/:id`
- `GET /admin/delete-requests`
- `POST /admin/delete-requests/:id/approve`
- `POST /admin/delete-requests/:id/reject`
- `DELETE /admin/courses/:id/hard-delete`

### Already Implemented (Data)
- `Role` enum includes `ADMIN`.
- `DeletionRequest` model supports admin decision fields (`adminNote`, `decidedAt`, `decidedById`).
- Course archive + hard delete semantics exist.

### Not Yet Implemented (Frontend)
- No Admin panel routes/pages.
- No admin UI workflow for user management, moderation, or deletion-request triage.

## Recommended Next Development Order
1. Admin route consumption layer in frontend (API client helpers + strict types).
2. Admin panel shell and route gating (role-restricted UI entry points).
3. Deletion request management UI (list + approve/reject with notes).
4. User management UI (role changes + deletion constraints).
5. Course moderation UI (archive visibility + hard delete safety prompts).
6. Analytics/system dashboards (if required for milestone scope).

## Risks to Monitor
- Mixed error response shapes complicate reusable frontend admin error handling.
- Deprecated endpoints still present may cause drift if reused by mistake.
- Validation strictness differs by route group (lesson controller path vs instructor path).
- No audit/event log model yet for admin actions.
- Hard delete operations are destructive; UI must enforce confirmation and visibility.

## Pre-Admin Cleanup Checklist
- [ ] Decide and document a unified error response contract for new admin endpoints.
- [ ] Confirm deprecated endpoints remain unused by frontend.
- [ ] Align lesson URL validation behavior across all lesson-create entry points.
- [ ] Define admin UI permissions matrix (which actions admin can perform where).
- [ ] Define admin action logging strategy (at minimum, deletion/role changes).
- [ ] Add admin-focused test checklist (role guard + ownership bypass expectations).

## Readiness Verdict
- **Readiness level:** Moderate
- **Recommended to start Admin UI now?** Yes, with parallel cleanup of error-format and validation consistency.
