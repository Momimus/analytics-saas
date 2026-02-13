# Changelog

## 2026-02

### Modern UI System Introduced
- Added shared design token layer for radius, surfaces, borders, shadows, accent, and motion timings.
- Introduced reusable UI primitives:
  - `GlassCard`
  - `StatCard`
  - `Badge`
  - `NotificationDot`
  - `SelectPopover`
- Added shared animation utilities for fade/scale transitions and one-time indicator pulse.

### Instructor Request Dashboard Migration
- Added aggregated instructor requests API endpoint for pending requests across owned courses.
- Moved request management to:
  - Instructor Home widget on `/dashboard`
  - Dedicated requests page `/instructor/requests`
- Simplified course editor request section to navigation-oriented UX.

### Badge and Request Indicator System
- Added count + unseen indicator behavior for pending access requests.
- Implemented lightweight seen-state tracking via localStorage timestamp and event-based refresh.
- Standardized nav and request badges using shared badge/dot components.

### Hardening Sprint: UI and API Consistency
- Migrated remaining frontend pages from legacy `Card` usage to `GlassCard`.
- Replaced Courses page custom dropdown portal logic with `SelectPopover`.
- Aligned course detail data flow to use `GET /courses/:id/public` for preview metadata.
- Kept `POST /courses/:id/request-access` as canonical and documented `POST /courses/:id/enroll` as deprecated alias.
- Added lightweight DTO hardening for:
  - student course catalog
  - course public detail
  - instructor aggregated requests
  - student enrollment status list
