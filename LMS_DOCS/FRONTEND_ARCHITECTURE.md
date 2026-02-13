# Frontend Architecture

## Structure
- `frontend/src/App.tsx`: route map and route guards
- `frontend/src/context/auth.tsx`: cookie-session hydration (`/me`)
- `frontend/src/components/AppShell.tsx`: header/sidebar/mobile drawer shell
- `frontend/src/components/ui/*`: shared primitives
- `frontend/src/lib/api.ts`: API wrapper with `credentials: include`
- `frontend/src/style.css` + `frontend/src/styles/tokens.css`: global theme and motion

## Routing and Access
- Public-only pages: login/register/forgot/reset
- Authenticated pages: dashboard, profile, courses, my-courses, lessons
- Role-gated pages: instructor workspace and requests
- No frontend Admin panel routes yet.

## Shared UI System Coverage
Implemented primitives:
- `GlassCard`
- `StatCard`
- `Badge`
- `NotificationDot`
- `SelectPopover`

Legacy status:
- `frontend/src/components/Card.tsx` still exists as deprecated wrapper to `GlassCard`.
- No active imports from `components/Card` were found in audited pages.

## Shell Layout System (Current)
- Sticky header with floating glass card.
- Desktop sticky sidebar with viewport-relative height behavior.
- Mobile drawer overlay positioned below header via CSS var offset.

Important shell variables in `AppShell`:
- `--app-header-h`
- `--app-shell-gap`
- `--app-header-offset`

## Responsiveness Notes (Code-Level Audit)
- **375x812**: mobile drawer architecture is structurally correct (overlay below header offset).
- **768x1024**: sidebar and header switch to desktop/tablet shell.
- **1366x768 / 1920x1080**: sticky sidebar + centered header active.

Known risks:
- Some auth pages use fixed full-screen wrappers (`fixed inset-0 overflow-y-auto`) outside normal document flow:
  - `frontend/src/pages/Login.tsx`
  - `frontend/src/pages/Register.tsx`
- This can behave differently from shell-based scroll ownership.

## Scroll Ownership
- Main app uses viewport/body scroll.
- Sidebar nav has internal scroll only when content exceeds sidebar space.
- Additional internal scroll containers intentionally exist in:
  - `CountrySelect` dropdown list
  - popovers/modals where needed

## Notification Pattern
- Pending requests badge/dot uses:
  - `/instructor/requests` response (`latestPendingAt`, `totalPending`)
  - localStorage seen timestamp (`lms:requests:lastSeenAt`)
- No websocket/polling beyond periodic refresh/focus refresh in shell.

## Frontend Risks to Watch
- Mixed fixed-position auth pages vs shell flow.
- Layout tweaks currently rely on hardcoded utility values in `AppShell`.
- `PublicOnlyRoute` loading panels still use legacy class style (`card-animate` + non-GlassCard markup).
