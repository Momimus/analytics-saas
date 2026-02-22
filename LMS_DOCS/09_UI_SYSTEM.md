# UI System

## Design System Overview
- Utility-first Tailwind styling with shared tokens.
- Reusable UI primitives enforce consistency in spacing, controls, and overlays.
- Mobile-first responsive behavior with compact moderation-focused layouts.

## Shared Components
- `StatCard`
  - metric display for dashboards
  - compact spacing and responsive typography
- `AdminTable`
  - shared table shell for admin/instructor operations
  - compact pagination and filter-chip support
  - optional mobile stack rendering (`responsiveMode="stack"`)
- `Select`
  - custom dropdown with keyboard support
  - container-driven width contract
- `Dialog`
  - shared modal shell for confirmations/details

## Responsive System
- Mobile-first breakpoints:
  - content stacks by default
  - expands with `sm/md/lg` as needed
- Dense data surfaces:
  - mobile stack mode for high-action admin rows
  - desktop full table mode

## Mobile vs Desktop Behavior
- Mobile:
  - compact controls (`h-8/h-9`)
  - action menus for dense rows
  - reduced card padding and tighter spacing
- Desktop:
  - full column tables
  - inline action buttons
  - wider panel layouts
