# Frontend Architecture

## Folder Structure
- `frontend/src/App.tsx`: route definitions
- `frontend/src/main.tsx`: app bootstrap + providers
- `frontend/src/pages/*`: route pages
- `frontend/src/components/*`: shared non-page components
- `frontend/src/components/ui/*`: modern reusable UI primitives
- `frontend/src/context/auth.tsx`: auth/session state
- `frontend/src/lib/*`: API helpers and domain utilities
- `frontend/src/style.css`: global styles and animation utilities
- `frontend/src/styles/tokens.css`: design tokens

## Routing Structure
Primary routes:
- `/dashboard` (home for all authenticated roles)
- `/courses`, `/courses/:id`
- `/my-courses` (student)
- `/instructor`, `/instructor/new`, `/instructor/courses/:id`, `/instructor/courses/:id/students`
- `/instructor/requests` (instructor/admin requests management)
- auth routes: `/login`, `/register`, `/forgot-password`, `/reset-password`

Route protection:
- `ProtectedRoute`: authenticated only
- `RoleProtectedRoute`: authenticated + role-restricted

## Shared UI System
Core primitives in `frontend/src/components/ui`:
- `GlassCard`: unified panel/card container for section blocks
- `StatCard`: standardized KPI tile
- `Badge`: consistent status/count pills
- `NotificationDot`: unseen indicator with optional pulse-once
- `SelectPopover`: custom dropdown (replaces native select where required)

UI system usage is mandatory for shared patterns. Do not introduce new legacy card wrappers or ad-hoc badge/stat/dropdown styles in pages.

Tokens:
- Defined in `frontend/src/styles/tokens.css`
- Imported globally from `frontend/src/style.css`
- Centralize radius, surfaces, borders, shadows, accent/glow, motion timing

## Building New Pages Correctly
When creating new pages:
1. Use `GlassCard` for content sections.
2. Use `StatCard` for numeric summaries.
3. Use `Badge` for statuses/counts.
4. Use `NotificationDot` for unseen indicators.
5. Use `SelectPopover` for themed dropdowns.
6. Keep page logic focused on data fetching + composition, not bespoke visual patterns.
7. Do not import legacy `Card`; use `GlassCard` directly.

## Using Shared Components
### Badge
- `variant`: `count` or `status`
- `tone`: `success`, `warn`, `neutral`
- Use for request counts, publish/draft labels, completion states.

### StatCard
- Props: `label`, `value`, optional `hint`, `icon`
- Use in dashboard and analytics summary rows.

### SelectPopover
- Props: `items`, `value`, `onChange`
- Use for filters and constrained option lists.
- Built-in active state and animated popover menu.

## State Management Approach
- Local component state (`useState`) for page-level concerns.
- Derived values via `useMemo`.
- Side effects/data fetch via `useEffect`.
- Auth state centralized in `AuthProvider`.

## Notification Behavior
- Pending requests badge is lightweight client-side logic.
- Data source: instructor requests API summary.
- Seen marker stored in localStorage timestamp.
- Badge visibility recomputed from:
  - latest pending request timestamp
  - last seen timestamp

## Migration Checklist
- Verify no imports from `frontend/src/components/Card.tsx` remain.
- Verify stat/count tiles are `StatCard`.
- Verify status/count pills are `Badge`.
- Verify custom filter dropdowns use `SelectPopover`.
