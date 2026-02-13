# Development Guidelines

## Non-Negotiables
- Keep cookie-auth model intact (`credentials: include` on frontend).
- Do not bypass role/ownership checks in service layer.
- Keep canonical endpoint usage (avoid reviving deprecated aliases).
- Keep docs updated in `LMS_DOCS` for behavior or API changes.

## Backend Guidance
1. Validate input at route boundary with explicit type checks.
2. Prefer service-layer ownership checks for instructor-scoped resources.
3. Keep response DTOs intentional and minimal.
4. Prefer consistent error format for new endpoints.

### Validation Baseline
- Profile: strict validator with field errors.
- Course create/update: trim + max length + image URL validation.
- Lesson create/update: trim + max length + URL validation.
- If adding new mutating payload fields, add backend-first validation.

## Frontend Guidance
1. Use `apiFetch` and preserve cookie auth.
2. Surface backend validation field errors in forms.
3. Reuse shared UI primitives for cards/stats/badges/dropdowns.
4. Keep shell/layout changes in `AppShell` and global style files only.

## UI System Rules
- Required shared components for common patterns:
  - `GlassCard`
  - `StatCard`
  - `Badge`
  - `NotificationDot`
  - `SelectPopover`
- `components/Card.tsx` is deprecated wrapper and should not be imported in new code.

## API Canonicality Rules
- Use `POST /courses/:id/request-access` for student requests.
- Treat `POST /courses/:id/enroll` as deprecated alias.
- Use `GET /courses/:id/public` for public-safe preview usage.

## Admin Milestone Discipline
Before adding Admin UI pages:
1. Confirm route response format consistency plan.
2. Confirm any admin endpoint DTOs are intentional and documented.
3. Confirm ownership and destructive actions are tested against role constraints.
4. Update `LMS_DOCS/ADMIN_MILESTONE_PREP.md` when readiness assumptions change.

## Pre-PR Checklist
- Did you preserve auth/role security assumptions?
- Did you add backend validation for new user input?
- Did you avoid deprecated endpoint usage?
- Did you update `README_PROJECT.md`, relevant architecture docs, and `CHANGELOG.md`?
