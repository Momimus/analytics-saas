# UI Compact Audit

## Baseline Verification (Before Changes)
- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: sandbox `EPERM` on spawn without elevation; pass with elevated execution
- `npm run build`: pass with elevated execution

## Inventory (Before)

### Dashboard Cards
- `frontend/src/components/ui/StatCard.tsx`
  - Shared metric card used across admin, instructor, and student dashboard surfaces.
  - Before: strong label tracking, `text-3xl` metric, `p-4`, hover elevation.
  - Density concern: internal spacing still roomy across dense metric grids.
- `frontend/src/pages/AdminDashboard.tsx`
  - Uses `StatCard` in an 8-card grid with `gap-4`.
  - Density concern: section/title spacing and card grid spacing can be tighter.
- `frontend/src/pages/InstructorDashboard.tsx`
  - Uses `StatCard` in dashboard metrics and nested `GlassCard` rows.
  - Density concern: top-level `gap-6` and card-to-card spacing can be compacted.
- `frontend/src/pages/InstructorStudents.tsx`
  - Uses `StatCard` trio in summary area.
  - Density concern: summary cards and table panel rhythm can be tighter.

### Tables + Pagination
- `frontend/src/components/admin/AdminTable.tsx`
  - Shared table wrapper for admin/instructor data grids.
  - Before: default table density does not enforce compact row/header padding unless `density="compact"` is passed.
  - Includes applied filter chips, sticky header shadow, selected-row highlight.
- `frontend/src/components/admin/AdminTable.tsx` (`AdminPagination`)
  - Before: page size selector width is fixed and stable; Prev/Next use `h-10`.
  - Density concern: controls are slightly tall for compact mode.
- Admin table consumers:
  - `frontend/src/pages/AdminUsers.tsx`
  - `frontend/src/pages/AdminCourses.tsx`
  - `frontend/src/pages/AdminEnrollments.tsx`
  - `frontend/src/pages/AdminInbox.tsx`
  - `frontend/src/pages/AdminAuditLogs.tsx`
  - `frontend/src/pages/AdminInstructors.tsx`
  - `frontend/src/pages/AdminInstructorDetail.tsx`

### Filter Bars / Toolbars
- `frontend/src/components/admin/AdminFilterBar.tsx`
  - Shared toolbar wrapper used by admin and instructor request pages.
  - Before: `p-3`, header gap and control spacing comfortable but still spacious.
- `frontend/src/pages/InstructorRequests.tsx`
  - Uses `AdminFilterBar` + `SelectPopover`; inherits current spacing.
- `frontend/src/pages/Courses.tsx`
  - Student search + select toolbar in a bordered control row.
  - Density concern: search input `py-2.5` and container spacing can be tightened.

### Control Sizing Foundations
- `frontend/src/lib/uiClasses.ts`
  - `formInputCompactClass`: `h-10`
  - `formSelectTriggerCompactClass`: `h-10`
  - Density concern: compact controls can move to `h-9` without logic changes.
- `frontend/src/components/Button.tsx`
  - Base button uses `px-5 py-3`.
  - Density concern: default button footprint is larger than compact target.

## Compact Targets
- Use shared-component-first compaction:
  - `StatCard` internal spacing and label tracking.
  - `AdminTable` default row/header density + compact pagination controls.
  - `AdminFilterBar` spacing/toolbar height tightening.
  - `Button` base footprint reduction.
  - `uiClasses` compact form control heights (`h-9`).
- Then apply small page-level spacing trims for major surfaces:
  - Admin dashboard, instructor dashboard, instructor requests, student courses.

## Before vs After

| Area | Before | After | Files |
|---|---|---|---|
| Compact control sizing | Inputs/select triggers used `h-10` compact classes. | Compact controls standardized to `h-9` for lower visual bulk and consistent toolbar alignment. | `frontend/src/lib/uiClasses.ts` |
| Buttons | Default button footprint used `px-5 py-3`. | Default button footprint reduced to `px-4 py-2.5`, preserving focus/accessibility behavior. | `frontend/src/components/Button.tsx` |
| Metric cards | `StatCard` had larger label tracking and roomier internal spacing. | `StatCard` label tracking and spacing tightened; metrics remain emphasized with slightly denser rhythm. | `frontend/src/components/ui/StatCard.tsx` |
| Card containers | `GlassCard` had broader default padding and larger header spacing. | Card and header spacing reduced for denser dashboards/detail panels. | `frontend/src/components/ui/GlassCard.tsx` |
| Table density | Admin tables relied on consumer classes unless `density="compact"` passed explicitly. | Shared `AdminTable` now defaults to compact density, with tighter skeleton, chips, and spacing. | `frontend/src/components/admin/AdminTable.tsx` |
| Pagination controls | Page-size select and Prev/Next controls felt tall (`h-10`). | Compact page-size select width + `h-9` Prev/Next controls with same behavior. | `frontend/src/components/admin/AdminTable.tsx` |
| Filter bars | `AdminFilterBar` had comfortable but larger panel/header spacing. | Toolbar spacing tightened (panel/header/control/chip rhythm) with same filter wiring. | `frontend/src/components/admin/AdminFilterBar.tsx` |
| Select/date popovers | Select/date triggers used wider minimums and roomier popover spacing. | Trigger minimum width lowered and option/panel spacing compacted while preserving keyboard behavior. | `frontend/src/components/ui/Select.tsx`, `frontend/src/components/ui/DateInput.tsx` |
| Admin dashboard rhythm | Section/grid spacing on metrics/activity/inbox blocks was looser. | Section/grid/control spacing trimmed for compact moderation scanning. | `frontend/src/pages/AdminDashboard.tsx` |
| Instructor dashboard rhythm | Header, metrics grid, and course card spacing used larger gaps. | Reduced top-level gaps and card spacing while keeping course actions/flows unchanged. | `frontend/src/pages/InstructorDashboard.tsx` |
| Instructor requests toolbar | Page spacing/heading footprint was larger. | Page spacing tightened and heading scale reduced for denser list workflow. | `frontend/src/pages/InstructorRequests.tsx` |
| Student course browsing | Search/filter toolbar and course cards used larger paddings. | Toolbar/card spacing tightened for calmer, more compact browsing view. | `frontend/src/pages/Courses.tsx` |
| Student home dashboard | Mixed student/instructor sections used larger gaps. | Section/card/action spacing trimmed to align with compact contract. | `frontend/src/pages/Dashboard.tsx` |
| Global content rhythm | Main content shell had larger vertical breathing (`py-6`). | App shell main content vertical padding reduced to `py-5`. | `frontend/src/components/AppShell.tsx` |

## Screens Impacted
- Admin: dashboard + all shared admin table surfaces (`users`, `courses`, `enrollments`, `inbox`, `audit logs`, `instructors`, `instructor detail`) through shared components.
- Instructor: dashboard + requests + table/toolbar surfaces using shared components.
- Student: dashboard and courses pages.

## Verification (After Changes)
- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: pass with elevated execution (sandbox `EPERM` otherwise)
- `npm run build`: pass with elevated execution (sandbox `EPERM` otherwise)

## Regression Remediation Mapping

| Reported Issue | Root Cause | Fix Applied | Files |
|---|---|---|---|
| Pagination select overlaps Prev/Next | `Select` trigger had hardcoded `min-w-32` that ignored container width (`w-16`). | Removed hardcoded minimum; made trigger width container-driven. | `frontend/src/components/ui/Select.tsx` |
| Pagination collision on small screens | Pagination controls were in a single flexible row without stable shrink/wrap constraints. | Reworked pagination layout into wrap-safe clusters with `w-16 sm:w-20`, `shrink-0`, and `min-w-0` safeguards. | `frontend/src/components/admin/AdminTable.tsx` |
| Mobile admin nav felt duplicated/messy | Mobile had both global drawer navigation and page-level admin tab strip. | Chosen strategy: AppShell drawer on mobile; hide `AdminSectionNav` on small screens. | `frontend/src/components/admin/AdminSectionNav.tsx` |
| Cards still looked oversized on mobile | Visual mass remained from card padding/shadow and delayed multi-column breakpoints. | Tuned shared card shells (mobile-first padding/radius/shadow) and moved key dashboards to `1 -> 2 -> 4` style grids. | `frontend/src/components/ui/StatCard.tsx`, `frontend/src/components/ui/GlassCard.tsx`, `frontend/src/pages/AdminDashboard.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/InstructorDashboard.tsx`, `frontend/src/pages/InstructorStudents.tsx` |
| Compact mode not uniform | Page-level overrides (`h-10`, roomy gaps) bypassed shared compact defaults. | Normalized listed admin/instructor pages to compact control heights and tighter section spacing. | `frontend/src/pages/AdminUsers.tsx`, `frontend/src/pages/AdminCourses.tsx`, `frontend/src/pages/AdminEnrollments.tsx`, `frontend/src/pages/AdminInbox.tsx`, `frontend/src/pages/AdminAuditLogs.tsx`, `frontend/src/pages/AdminInstructors.tsx`, `frontend/src/pages/AdminInstructorDetail.tsx`, `frontend/src/pages/InstructorRequests.tsx` |
| Chip remove icon mojibake | Encoding regression introduced invalid glyph rendering. | Replaced remove glyph with proper `×` and verified no mojibake remains. | `frontend/src/components/admin/AdminTable.tsx` |
