# Frontend

## Stack
- React 19 + TypeScript
- Vite build/dev pipeline
- Tailwind CSS utility styling

## Folder Structure
- `frontend/src/components/` - reusable UI and layout components
- `frontend/src/pages/` - route-level page screens
- `frontend/src/context/` - auth/theme providers
- `frontend/src/lib/` - API client and helpers
- `frontend/src/styles/` - tokens and style layers

## Routing System
- Defined in `frontend/src/App.tsx` using React Router.
- Route protection:
  - `ProtectedRoute` for authenticated pages
  - `RoleProtectedRoute` for role-specific pages
- UX fallback routes:
  - `404` page for unknown routes
  - `403` page for role mismatch

## AppShell and Layout
- `AppShell` provides:
  - global header
  - role-aware nav links
  - mobile drawer nav
  - page container spacing
- Admin section nav is shown on `sm+` and hidden on narrow mobile to avoid duplicate mobile navigation.

## Shared UI Component System
- Core shared components:
  - `StatCard`
  - `GlassCard`
  - `AdminTable`
  - `Select`
  - `DateInput`
  - `Dialog`
- Error/safety UX:
  - global `ErrorBoundary`
  - inline retry error state
  - toast feedback

## Responsive Strategy
- Mobile-first breakpoints (`sm`, `md`, `lg`).
- Dashboard metrics use `1 -> 2 -> 4` grid progression where applicable.
- Dense admin tables support mobile stack mode:
  - `AdminTable` with `responsiveMode="stack"` and `mobileStack`.
- Actions are compact on mobile and inline on desktop.
