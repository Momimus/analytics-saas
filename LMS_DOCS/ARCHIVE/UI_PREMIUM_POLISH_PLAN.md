# UI Premium Polish Plan

## Scope Rules
- UI-only refinements.
- No route/API/RBAC/business-logic changes.
- Keep existing data/state wiring intact.

## Baseline Status
- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: sandbox EPERM without elevation; pass with elevated execution
- `npm run build`: sandbox EPERM without elevation; pass with elevated execution

## Admin Pages and Planned Polish

### `AdminDashboard`
- Blocks:
  - metric cards
  - recent activity table
  - action inbox panels
  - confirm modal + toast
- Polish:
  - consistent section headers and spacing
  - premium cards (loading skeleton-ready visual language)
  - table hover/separator improvements (shared table where possible)

### `AdminUsers`
- Blocks:
  - filter toolbar
  - users table + pagination
  - confirm modal + toast
- Polish:
  - premium filter toolbar structure
  - active filters badge/chips
  - table sticky header/row hover/visual density options

### `AdminCourses`
- Blocks:
  - filter toolbar
  - courses table + pagination
  - deletion request list
  - confirm modal + toast
- Polish:
  - toolbar/action alignment
  - table premium visuals
  - improved panel hierarchy for deletion requests

### `AdminEnrollments`
- Blocks:
  - filter toolbar
  - enrollments table + pagination
  - manual action panel
  - confirm modal + toast
- Polish:
  - toolbar/filters consistency
  - table readability upgrades
  - spacing and control consistency in manual panel

### `AdminInbox`
- Blocks:
  - summary card
  - filter toolbar
  - enrollment table + pagination
  - deletion table
  - confirm modal + toast
- Polish:
  - consistent premium toolbar
  - premium table visuals for both tables
  - consistent card stacking rhythm

### `AdminAuditLogs`
- Blocks:
  - filter toolbar
  - audit table + pagination
  - detail dialog
- Polish:
  - toolbar alignment/active filter indicators
  - table premium visuals
  - detail dialog spacing and metadata readability

### `AdminInstructors`
- Blocks:
  - filter controls
  - instructors table + pagination
  - confirm modal + toast
- Polish:
  - migrate to consistent toolbar
  - table style parity with other admin pages

### `AdminInstructorDetail`
- Blocks:
  - profile/metrics header
  - courses table + pagination
  - students table + pagination
  - confirm modal + toast
- Polish:
  - premium profile header card
  - two-column responsive detail rhythm
  - table parity + filters toolbar consistency

## Instructor Pages and Planned Polish

### `InstructorDashboard`
- Blocks:
  - top header actions
  - metrics cards
  - courses list
  - deletion request dialog
- Polish:
  - premium dashboard card rhythm
  - dialog style parity with shared dialog
  - clearer panel hierarchy

### `InstructorCourseEditor`
- Blocks:
  - course summary/form card
  - requests helper card
  - lessons list/editor
  - delete lesson dialog
- Polish:
  - section spacing and card hierarchy
  - dialog style parity
  - list row treatment and action spacing polish

### `InstructorRequests`
- Blocks:
  - filter row
  - request cards/actions
- Polish:
  - premium toolbar style
  - card and button hierarchy consistency

### `InstructorStudents`
- Blocks:
  - back action
  - student roster list
- Polish:
  - optional profile summary strip
  - two-column responsive roster polish

## Shared Components Targeted
- `frontend/src/components/admin/AdminTable.tsx`
- `frontend/src/components/admin/AdminFilterBar.tsx`
- `frontend/src/components/admin/ConfirmActionModal.tsx`
- `frontend/src/components/admin/ToastBanner.tsx`
- `frontend/src/components/ui/Dialog.tsx`
- `frontend/src/components/ui/StatCard.tsx` (style-level only if needed)

## Completion Checklist
- [x] Step 2: Premium table experience
  - Updated `frontend/src/components/admin/AdminTable.tsx`
  - Applied sticky/zebra/filter-chip behavior on admin/instructor table pages
- [x] Step 3: Premium filter/toolbar
  - Updated `frontend/src/components/admin/AdminFilterBar.tsx`
  - Wired title/helper/active-filter badges across admin + instructor request filtering
- [x] Step 4: Premium dashboards/detail panels
  - Updated `frontend/src/components/ui/StatCard.tsx` (loading visual variant)
  - Updated `frontend/src/pages/AdminDashboard.tsx`
  - Updated `frontend/src/pages/InstructorDashboard.tsx`
  - Updated `frontend/src/pages/AdminInstructorDetail.tsx`
  - Updated `frontend/src/pages/InstructorStudents.tsx`
- [x] Step 5: Modal/feedback consistency
  - Updated `frontend/src/pages/InstructorDashboard.tsx` to use shared `Dialog`
  - Updated `frontend/src/pages/InstructorCourseEditor.tsx` to use shared `Dialog`
  - Updated `frontend/src/components/admin/ToastBanner.tsx` styling consistency
- [x] Step 6: Optional extras (only low-risk)
  - Applied subtle interaction polish through table row transitions and consistent card/toolbar spacing.
  - Micro tweaks completed:
    - Toast icon encoding fixed with SVG status icons
    - Admin table row-selected visual state added
    - Sticky-header scroll shadow added for scroll context
    - Applied filter chips now support per-chip remove action
- [x] Step 7: Docs fully updated
  - Updated `README.md`
  - Updated `LMS_DOCS/LMS_SYSTEM_ARCHITECTURE.md`
  - Updated `LMS_DOCS/UI_COMPONENT_AUDIT.md`
  - Updated `LMS_DOCS/UI_PREMIUM_POLISH_PLAN.md`
- [x] Step 8: Final verification
  - `npm run typecheck`: pass
  - `npm run lint`: pass
  - `npm run test`: pass (with elevated execution due to sandbox EPERM)
  - `npm run build`: pass (with elevated execution due to sandbox EPERM)

## Compact UI Pass (Completed)
- Objective: reduce visual density across admin/instructor/student surfaces without behavior or contract changes.
- Shared compact updates:
  - `frontend/src/lib/uiClasses.ts` compact controls standardized to `h-9`.
  - `frontend/src/components/Button.tsx` reduced default button footprint.
  - `frontend/src/components/ui/StatCard.tsx` tightened label/metric spacing.
  - `frontend/src/components/ui/GlassCard.tsx` tightened card/header spacing.
  - `frontend/src/components/admin/AdminTable.tsx` compact default density and pagination controls.
  - `frontend/src/components/admin/AdminFilterBar.tsx` compact toolbar spacing.
- Page-level compact trims:
  - `frontend/src/pages/AdminDashboard.tsx`
  - `frontend/src/pages/InstructorDashboard.tsx`
  - `frontend/src/pages/InstructorRequests.tsx`
  - `frontend/src/pages/Courses.tsx`
  - `frontend/src/pages/Dashboard.tsx`

## Responsive Remediation Checklist (Completed)
- [x] Fixed pagination overlap contract
  - `frontend/src/components/ui/Select.tsx`: removed hardcoded trigger minimum width; width now container-driven.
  - `frontend/src/components/admin/AdminTable.tsx`: pagination controls grouped with wrap-safe layout and fixed small page-size width.
- [x] Fixed mobile admin nav duplication
  - `frontend/src/components/admin/AdminSectionNav.tsx`: hidden on small screens so AppShell drawer is the sole mobile admin nav.
- [x] Applied mobile-first dashboard card grids
  - `frontend/src/pages/AdminDashboard.tsx`
  - `frontend/src/pages/Dashboard.tsx`
  - `frontend/src/pages/InstructorDashboard.tsx`
  - `frontend/src/pages/InstructorStudents.tsx`
- [x] Removed compact-mode regressions
  - standardized remaining `h-10` action controls to compact `h-9` across admin/instructor list pages.
- [x] Fixed encoding regression
  - `frontend/src/components/admin/AdminTable.tsx`: chip remove glyph normalized to `×`.

## Responsive Audit + Fix (Completed)
- Audit output created:
  - `LMS_DOCS/UI_RESPONSIVENESS_AUDIT.md`
- Shared responsive implementation:
  - `frontend/src/components/admin/AdminTable.tsx` now supports mobile stack mode (`responsiveMode` + `mobileStack`).
  - `frontend/src/components/admin/MobileActionMenu.tsx` added for compact mobile row actions.
- High-impact responsive pages remediated:
  - `frontend/src/pages/AdminUsers.tsx`
  - `frontend/src/pages/AdminEnrollments.tsx`
  - `frontend/src/pages/AdminInbox.tsx`
- Card spacing cleanup extended:
  - `frontend/src/pages/MyCourses.tsx`
  - `frontend/src/pages/CourseDetail.tsx`
