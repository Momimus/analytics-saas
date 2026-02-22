# UI Component Audit

## Scope
Inventory of dropdown/select/popover/date-picker/dialog/tooltip usage before UI refinement.

## UI Foundation Decision
- Chosen system: extend the existing in-repo custom UI primitives (`frontend/src/components/ui/*`) with Tailwind + existing glass theme tokens.
- Reason: already integrated, no external dependency churn, lowest behavioral risk.
- Shared primitives now used:
  - `Select` (`frontend/src/components/ui/Select.tsx`)
  - `DateInput` (`frontend/src/components/ui/DateInput.tsx`)
  - `Dialog` (`frontend/src/components/ui/Dialog.tsx`)
  - `SelectPopover` preserved as compatibility wrapper over `Select`

## Design Contract
- Sizes:
  - trigger height `h-10`, compact density
- Radius:
  - trigger/popup `var(--ui-radius-md)` / `var(--ui-radius-xl)`
- Focus:
  - accent ring using `var(--ui-accent-soft)` + border accent
- Surfaces:
  - glass surface tokens (`--ui-glass-surface`, `--ui-glass-elevated`)
- Overlays:
  - backdrop `bg-black/55`, blurred glass panel
- Accessibility:
  - select/date popovers: escape-to-close, click-outside-close, keyboard navigation
  - dialogs: escape-to-close, click-outside-close, focus trap, restore focus on close

## Inventory (Before)

| File | Component/Screen | Current UI Type | Controls | Risk |
|---|---|---|---|---|
| `frontend/src/pages/AdminUsers.tsx` | Admin users filters | Native `<select>` | role/status filters | High |
| `frontend/src/pages/AdminCourses.tsx` | Admin courses filters | Native `<select>` + native `type="date"` | state + date range filters | High |
| `frontend/src/pages/AdminEnrollments.tsx` | Admin enrollments filters | Native `<select>` + native `type="date"` | status + date range filters | High |
| `frontend/src/pages/AdminInbox.tsx` | Admin inbox filters | Native `<select>` + native `type="date"` | kind + date range filters | High |
| `frontend/src/pages/AdminAuditLogs.tsx` | Audit logs filters | Native `<select>` + native `type="date"` | action/entity/date filters | High |
| `frontend/src/pages/AdminInstructors.tsx` | Admin instructors filters | Native `<select>` | status filter | Medium |
| `frontend/src/pages/AdminInstructorDetail.tsx` | Instructor detail course filters | Native `<select>` | course status filter | Medium |
| `frontend/src/components/admin/AdminTable.tsx` | Pagination page size | Native `<select>` | page-size selection | High |
| `frontend/src/pages/Courses.tsx` | Student catalog filter | Custom `SelectPopover` | enrolled/not-enrolled filter | Medium |
| `frontend/src/pages/InstructorRequests.tsx` | Instructor request filters | Custom `SelectPopover` | course filter | Medium |
| `frontend/src/components/ui/SelectPopover.tsx` | Shared custom select | Custom popover/listbox | generic select behavior | Medium |
| `frontend/src/components/layout/UserMenuDropdown.tsx` | Header account menu | Custom dropdown menu | navigation/actions | Medium |
| `frontend/src/components/admin/ConfirmActionModal.tsx` | Admin action confirmation | Custom modal | reason + confirm/cancel | High |
| `frontend/src/pages/AdminAuditLogs.tsx` | Audit log detail popup | Inline custom modal | metadata/detail display | Medium |

## Date/Calendar Library Scan
- No external date-picker libraries detected (`react-datepicker`, `flatpickr`, `date-fns`, `dayjs` not found in frontend source/package usage).
- Current date filtering relies on native `<input type="date">`.

## UI Library Scan
- No Radix/Headless UI/MUI/Antd usage detected in current frontend source/package manifest.

## Tooltips
- No dedicated tooltip primitive usage found in current source.

## Migration Priority
1. Admin filters/table size/date inputs
2. Instructor filters
3. Student filters
4. Existing popover/select adapters and modal polish

## After Migration (Old vs New)

| Screen/Feature | Old Component | New Component | Notes | Risk |
|---|---|---|---|---|
| Admin Users filters | Native `<select>` | `ui/Select` | Same state/query param behavior | High |
| Admin Courses filters | Native `<select>` + native date input | `ui/Select` + `ui/DateInput` | Date value remains `YYYY-MM-DD` string | High |
| Admin Enrollments filters | Native `<select>` + native date input | `ui/Select` + `ui/DateInput` | No payload/query changes | High |
| Admin Inbox filters | Native `<select>` + native date input | `ui/Select` + `ui/DateInput` | Same filtering logic | High |
| Admin Audit filters | Native `<select>` + native date input | `ui/Select` + `ui/DateInput` | Same API params (`action/entityType/dateFrom/dateTo`) | High |
| Admin Instructors filters | Native `<select>` | `ui/Select` | Same API params | Medium |
| Admin Instructor detail course filters | Native `<select>` | `ui/Select` | Same API params | Medium |
| Admin table pagination size | Native `<select>` | `ui/Select` | `pageSize` number conversion preserved | High |
| Shared course/instructor filter popover | `SelectPopover` (custom) | `SelectPopover` wrapper -> `ui/Select` | Backward-compatible props | Medium |
| Admin confirm modal | Inline custom modal container | `ui/Dialog` + existing modal content | Focus trap + escape/click-outside added | High |
| Audit event detail popup | Inline custom modal container | `ui/Dialog` wrapper | Content unchanged, accessibility improved | Medium |
| Instructor deletion request modal | Inline modal container | `ui/Dialog` wrapper | Behavior unchanged, improved accessibility | Medium |
| Instructor lesson delete modal | Inline modal container | `ui/Dialog` wrapper | Behavior unchanged, improved accessibility | Medium |

## Remaining Spots
- `UserMenuDropdown` remains a custom dropdown implementation (already themed and non-native).
- No native `<select>` or native date picker inputs remain in frontend source.

## Premium Props and Patterns Added
- `AdminTable` new optional props:
  - `stickyHeader`
  - `density` (`comfortable` | `compact`)
  - `zebraRows`
  - `appliedFilters`
  - `onClearFilters`
- `AdminFilterBar` extended props:
  - `title`
  - `helper`
  - `activeFilterCount`
- `StatCard` extended prop:
  - `loading`
