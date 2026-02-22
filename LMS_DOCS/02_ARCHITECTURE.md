# Architecture

## Monorepo Structure
- Root workspace: `lms`
- Workspaces:
  - `frontend/` - SPA UI
  - `backend/` - REST API
- Shared orchestration scripts at root:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `npm run check`

## Frontend <-> Backend Interaction
- Frontend sends HTTP requests via a shared API client.
- Requests include cookie credentials (`HttpOnly` auth cookie model).
- Backend validates auth/role/middleware rules and returns JSON payloads.
- Frontend renders role-specific UI from response data.

## Request Lifecycle
1. User action in browser (button/form/navigation).
2. Frontend calls API endpoint.
3. Backend middleware validates:
   - auth
   - CSRF/origin (mutating requests)
   - RBAC where required
4. Route/controller/service executes business logic.
5. Prisma reads/writes PostgreSQL.
6. API returns JSON.
7. Frontend updates local state and UI.

## Shared Design Principles
- Keep role boundaries explicit.
- Keep business logic in backend services.
- Keep UI behavior additive and route-safe.
- Favor predictable JSON contracts and centralized error handling.
