# LMS Project Documentation

## Overview
This repository is a Learning Management System (LMS) monorepo with separate frontend and backend workspaces.

- Frontend: React + TypeScript + Vite + Tailwind
- Backend: Express + TypeScript + Prisma + PostgreSQL
- Package management: npm workspaces

## Tech Stack
- UI: React 19, React Router, Tailwind CSS
- API: Express 5, cookie-based auth, role guards
- Database: PostgreSQL via Prisma ORM
- Build checks: TypeScript no-emit (`typecheck`/`lint` scripts)

## Architecture Summary
- `frontend/src/pages`: route-level pages
- `frontend/src/components`: reusable UI and shell components
- `frontend/src/components/ui`: modern shared design system primitives
- `backend/src/routes`: route grouping by domain (`courses`, `student`, `instructor`)
- `backend/src/services`: DB/business logic layer
- `backend/src/controllers`: route handlers for public/shared course and lesson APIs
- `backend/prisma/schema.prisma`: authoritative data model

## Roles and Capabilities
- `STUDENT`
  - Browse courses
  - Request access to published courses
  - Access lessons only when enrollment is `ACTIVE`
  - Track lesson progress
- `INSTRUCTOR`
  - Manage own courses and lessons
  - Review and approve/reject access requests
  - Submit course deletion requests
- `ADMIN`
  - Full instructor capabilities
  - Manage deletion requests
  - Hard delete courses
  - Manage user roles

## Enrollment Flow Summary
Enrollment is state-based on `Enrollment.status`:
- `REQUESTED`: student submitted access request
- `ACTIVE`: approved (access granted)
- `REVOKED`: removed/rejected

Student request is persisted in `Enrollment` (upsert by `userId + courseId`).

## Requests Flow Summary
- Student requests access via student endpoint.
- Instructor/Admin sees pending requests via aggregated instructor endpoint.
- Instructor/Admin approves/rejects using enrollment status update endpoints.
- Instructor home and requests page are the primary request management UI.

## Canonical API Endpoints
- `GET /courses/:id/public`
  - Public preview-safe course metadata for browsing UI.
- `GET /courses/:id`
  - Auth-protected course detail; role/enrollment checks apply.
- `POST /courses/:id/request-access`
  - Canonical student access request endpoint.
- `POST /courses/:id/enroll`
  - Deprecated alias of `request-access` retained for compatibility only; new frontend code must not use it.

## Badge System Summary
- Lightweight client-side unseen indicator.
- Pending requests count fetched from instructor requests API.
- Unseen state is tracked in localStorage timestamp (no backend unread table).
- Badge/dot clears when user opens requests surfaces.

## UI System Summary
The frontend includes a reusable modern UI system:
- Tokens: `frontend/src/styles/tokens.css`
- Shared components:
  - `GlassCard`
  - `StatCard`
  - `Badge`
  - `NotificationDot`
  - `SelectPopover`
- Motion conventions:
  - fast: 150ms
  - normal: 200ms
  - fade/scale dropdown + badge transitions

## Migration Checklist (Current)
- Completed: legacy page-level `Card` usage migrated to `GlassCard`.
- Completed: Courses filter dropdown migrated to `SelectPopover`.
- Remaining: continue replacing any future ad-hoc status or stats blocks with `Badge` and `StatCard` during feature work.
