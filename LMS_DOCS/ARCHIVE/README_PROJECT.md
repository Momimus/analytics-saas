# LMS Project Documentation

## Overview
LMS monorepo with two npm workspaces:
- `frontend`: React + TypeScript + Vite + Tailwind
- `backend`: Express + TypeScript + Prisma + PostgreSQL

This documentation reflects current behavior as audited (read-only) before Admin module implementation.

## Current Architecture Snapshot
- Frontend routes are protected by auth/role wrappers in `frontend/src/App.tsx`.
- Backend is split by route groups:
  - `backend/src/routes/courses.ts`
  - `backend/src/routes/student.ts`
  - `backend/src/routes/instructor.ts`
  - Admin and auth routes in `backend/src/index.ts`
- Business logic is primarily in services (`backend/src/services/*`).

## Auth and Security Model
- Cookie-first auth (`credentials: include`) with JWT in HTTP-only cookie.
- `requireAuth` resolves user role from DB on every protected request.
- Mutating methods (`POST/PATCH/PUT/DELETE`) are origin-checked against `ALLOWED_ORIGINS`.
- Role guard middleware enforces route-level role constraints.

Known consistency gap:
- Error response shapes are mixed:
  - many endpoints return `{ error: string }`
  - profile validation returns `{ ok: false, error: "VALIDATION_ERROR", message, fieldErrors }`

## Role Model
- `STUDENT`
  - browse published catalog
  - request access
  - access lessons only when enrollment is `ACTIVE`
- `INSTRUCTOR`
  - manage own courses/lessons via `/instructor/*`
  - review access requests
  - submit course deletion requests
- `ADMIN`
  - instructor capabilities plus:
  - manage roles
  - approve/reject deletion requests
  - hard delete courses
  - delete users with instructor ownership guard

## Canonical Endpoint Set
- `GET /courses` (published + non-archived catalog)
- `GET /courses/:id/public` (public-safe detail)
- `GET /courses/:id` (auth protected, enrollment/role constrained)
- `GET /courses/:id/lessons` (auth protected, role/enrollment constrained)
- `POST /courses/:id/request-access` (canonical student request path)

Deprecated alias:
- `POST /courses/:id/enroll` (backward compatibility only)

## Enrollment and Requests Workflow
- Student request writes/upserts `Enrollment` with `REQUESTED`.
- Instructor/Admin sees pending requests via:
  - `GET /instructor/requests` (aggregated)
- Approve/reject via:
  - `POST /instructor/enrollments/:id/approve`
  - `POST /instructor/enrollments/:id/revoke`
- Frontend badge system is client-side:
  - localStorage seen timestamp
  - no backend unread table

## Course Lifecycle
- Create draft (`isPublished=false`)
- Publish/unpublish via instructor endpoints
- Deletion request workflow:
  - Instructor submits request
  - Admin approve -> soft delete (`archivedAt`, `isPublished=false`)
- Hard delete is admin-only and removes related lessons/progress/enrollments.

## Validation Coverage (Current)
- Profile update has strict backend validation (`profileValidation.ts`) with field-level errors.
- Course create/update has trim + max length + direct image URL validation.
- Instructor lesson routes validate URL format (`http/https` or upload placeholder).

Known gap:
- Public lesson-create route in `lessonController` (`POST /courses/:id/lessons`) uses looser URL handling than instructor route path.

## UI System and Layout
- Shared token system in `frontend/src/styles/tokens.css`.
- Shared UI primitives:
  - `GlassCard`, `StatCard`, `Badge`, `NotificationDot`, `SelectPopover`
- Shell layout:
  - sticky floating header
  - sticky desktop sidebar
  - mobile drawer below header offset

Known layout risk:
- Some auth pages use fixed full-screen wrappers (`fixed inset-0 overflow-y-auto`) which may diverge from shell scrolling behavior.

## Admin Milestone Pointer
See `LMS_DOCS/ADMIN_MILESTONE_PREP.md` for:
- readiness score
- missing building blocks
- pre-admin cleanup checklist.
