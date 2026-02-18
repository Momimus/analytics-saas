# UI Responsiveness Audit

## Baseline Verification
- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: sandbox `EPERM` without elevation; pass with elevated execution
- `npm run build`: sandbox `EPERM` without elevation; pass with elevated execution

## Inventory: Card Surfaces
- Shared card components:
  - `frontend/src/components/ui/StatCard.tsx` (metrics)
  - `frontend/src/components/ui/GlassCard.tsx` (section panels)
- High-frequency card pages:
  - `frontend/src/pages/AdminDashboard.tsx` (metric cards + inbox cards)
  - `frontend/src/pages/Dashboard.tsx` (student/instructor summary cards)
  - `frontend/src/pages/InstructorDashboard.tsx` (metrics + course cards)
  - `frontend/src/pages/InstructorStudents.tsx` (metrics + student cards)
  - `frontend/src/pages/Courses.tsx` / `frontend/src/pages/MyCourses.tsx` / `frontend/src/pages/CourseDetail.tsx` (course item cards)
- Other card-like raw containers:
  - `frontend/src/pages/AdminDashboard.tsx` (pending request item boxes)
  - `frontend/src/pages/AdminCourses.tsx` (deletion request cards)
  - `frontend/src/pages/InstructorCourseEditor.tsx` (lesson blocks)
  - auth/utility pages using `GlassCard` with larger page-level padding classes

## Inventory: Data Tables/Lists
- Shared admin table:
  - `frontend/src/components/admin/AdminTable.tsx`
  - Pagination in same file (`AdminPagination`)
- Admin pages using table surfaces:
  - `frontend/src/pages/AdminUsers.tsx` (4 columns + 3 action buttons)
  - `frontend/src/pages/AdminEnrollments.tsx` (5 columns + action buttons)
  - `frontend/src/pages/AdminInbox.tsx` (2 table blocks, enrollment + deletion)
  - `frontend/src/pages/AdminCourses.tsx`
  - `frontend/src/pages/AdminInstructors.tsx`
  - `frontend/src/pages/AdminInstructorDetail.tsx` (courses + students tables)
  - `frontend/src/pages/AdminAuditLogs.tsx`
- Non-admin list surfaces:
  - `frontend/src/pages/InstructorRequests.tsx` (already card-list)
  - `frontend/src/pages/InstructorStudents.tsx` (card-list)
  - `frontend/src/pages/Courses.tsx` (card-list)

## Current Responsive Strategy (Observed)
- Breakpoints:
  - Most metrics use `grid-cols-1` with `sm`/`md` expansion.
  - Some list/card surfaces still rely on `md` for useful multi-column behavior.
- Table behavior:
  - Tables use `overflow-x-auto` and keep full desktop columns.
  - No shared “mobile stack row” mode yet for dense action tables.
- Actions:
  - Many admin rows still use multiple inline action buttons.
  - On narrow screens these wrap awkwardly and create vertical noise.
- Width control:
  - `Select` now container-driven (no hardcoded minimum trigger width).
  - Pagination row now wrap-safe, but table row actions remain large on phone widths.

## A) Excess Whitespace Cards
- `frontend/src/pages/AdminDashboard.tsx` — **High**
  - Repeated nested card wrappers and action blocks create visible vertical spacing.
  - Metric grid improved but request item cards still have generous spacing.
- `frontend/src/pages/InstructorDashboard.tsx` — **High**
  - Course cards with multiple metadata lines + action row feel tall on mobile.
- `frontend/src/pages/Dashboard.tsx` — **Medium**
  - Mixed student/instructor blocks; some sections remain spaced for desktop first.
- `frontend/src/pages/InstructorStudents.tsx` — **Medium**
  - Student cards can be dense and tall when content wraps.
- `frontend/src/pages/MyCourses.tsx` / `frontend/src/pages/CourseDetail.tsx` — **Medium**
  - Raw item cards still use roomier `p-4` style blocks.

## B) Bad Responsive Lists/Tables
- `frontend/src/pages/AdminUsers.tsx` — **High**
  - 4-column table with 3 inline actions; mobile wrapping is cramped.
- `frontend/src/pages/AdminEnrollments.tsx` — **High**
  - Dense columns + action cluster; small-screen readability suffers.
- `frontend/src/pages/AdminInbox.tsx` — **High**
  - Two moderation tables with bulky buttons, poor narrow-width ergonomics.
- `frontend/src/pages/AdminCourses.tsx` — **Medium**
  - Table remains usable via horizontal scroll but action row density is high.
- `frontend/src/pages/AdminInstructors.tsx` — **Medium**
  - Actions and detail-link controls compete for width on small screens.
- `frontend/src/pages/AdminInstructorDetail.tsx` — **Medium**
  - Dual table sections stack long and require tighter mobile action ergonomics.
- `frontend/src/pages/AdminAuditLogs.tsx` — **Low/Medium**
  - Mostly read-only table; acceptable with horizontal scroll but can still feel dense.

## Target Contract
### Cards Contract
- No fixed min-height unless functionally required.
- Mobile-first padding:
  - `p-3` mobile, `sm:p-4` desktop/tablet.
- Content-driven vertical rhythm:
  - internal `gap-2`/`space-y-2` instead of larger fixed spacing.
- Labels/titles:
  - wrap safely; no reserved blank space for long text.

### Data List Contract
- Mobile:
  - prefer stacked row cards for dense action tables.
  - fallback to horizontal scroll only for read-heavy surfaces.
- Desktop:
  - keep full table columns and inline actions.
- Row actions:
  - mobile uses compact action menu or compact grouped buttons.
  - desktop keeps existing inline actions.

### Buttons/Controls Contract
- Mobile buttons:
  - `h-8` or `h-9`, tighter horizontal padding.
- Long labels:
  - use truncation or move to compact action menu.
- Constrained controls:
  - enforce `min-w-0`, `max-w-full`, and wrap-safe flex clusters.

## Before/After Mapping
| Screen/Area | Before | After | Impact |
|---|---|---|---|
| `AdminUsers` table/actions | Dense multi-button action cell wrapped poorly on mobile; columns cramped. | Mobile stack rows via `AdminTable responsiveMode="stack"` + compact `MobileActionMenu`; desktop table unchanged. | High |
| `AdminEnrollments` table/actions | Action buttons bulky in narrow table cells; poor readability on phone widths. | Mobile stack rows with compact action menu; desktop table preserved; existing handlers reused. | High |
| `AdminInbox` enrollment/deletion tables | Two dense moderation tables stacked with bulky row buttons on mobile. | Both tables now render mobile stack rows with compact action menu; desktop columns unchanged. | High |
| Pagination row (`AdminPagination`) | Page-size select and nav controls susceptible to collision under width pressure. | Wrap-safe control clusters with constrained selector width and non-shrinking nav buttons. | High |
| Shared card surfaces (`StatCard`/`GlassCard`) | Some cards still felt visually heavy on smaller screens. | Mobile-first compact shell (`p-3`, softer mobile shadow, content-driven spacing), `sm` scale-up. | Medium |
| Course item cards (`MyCourses`, `CourseDetail`) | Roomier item cards created excess vertical space. | Mobile card padding reduced to `p-3` with `sm:p-4` fallback. | Medium |

## Verification (Post-Remediation)
- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm run test`: sandbox `EPERM` without elevation; pass with elevated execution
- `npm run build`: sandbox `EPERM` without elevation; pass with elevated execution
