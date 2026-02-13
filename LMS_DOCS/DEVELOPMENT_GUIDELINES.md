# Development Guidelines

## Coding Standards
- Keep TypeScript strict and explicit.
- Avoid `any`; prefer typed DTOs and utility types.
- Use small, focused components/services.
- Validate external input close to route boundaries.
- Keep business logic in services, not route handlers where possible.

## Adding New Backend Routes
1. Add route in appropriate module (`student`, `instructor`, `courses`).
2. Apply `requireAuth` and `requireRole` as needed.
3. Add ownership checks in service layer for instructor-scoped resources.
4. Return minimal response shape needed by frontend.
5. Keep DB access inside service functions.
6. Add/update docs in `LMS_DOCS` after behavior changes.

## Adding New UI Components
1. Add reusable primitives under `frontend/src/components/ui`.
2. Use token variables from `frontend/src/styles/tokens.css`.
3. Keep animation timing on shared token durations.
4. Expose small prop APIs; avoid one-off page coupling.

## Shared UI vs Custom UI
Use shared components when:
- rendering section cards/panels
- rendering KPI/stat tiles
- rendering status/count badges
- rendering unseen indicators
- rendering themed dropdowns

Use page-specific markup only for domain-specific layout and data composition.

## Keeping Design System Consistent
- Prefer component props for variation over duplicated Tailwind blocks.
- If multiple pages need same visual pattern, move it to shared UI components.
- Update token values centrally instead of page-level class drift.

## State and Effects
- Keep fetch side effects in `useEffect`.
- Keep derived values in `useMemo`.
- Keep transient UI states local.
- For lightweight cross-page indicators, use deterministic localStorage + events only when backend unread tracking is out of scope.

## Documentation Update Rule
After major change, update:
- `README_PROJECT.md` for product-level behavior
- `FRONTEND_ARCHITECTURE.md` or `BACKEND_ARCHITECTURE.md` for structural changes
- `DATA_MODEL.md` for schema/state machine changes
- `CHANGELOG.md` for milestone summary

## Pre-PR Checklist
- Did you use shared UI primitives (`GlassCard`, `StatCard`, `Badge`, `NotificationDot`, `SelectPopover`)?
- Did you avoid new legacy `Card` usage?
- Did you keep canonical endpoint usage (`/courses/:id/public` preview, `/courses/:id/request-access` request flow)?
- Did you update `LMS_DOCS/CHANGELOG.md`?
- Did you update docs for any API or UI behavior change?
