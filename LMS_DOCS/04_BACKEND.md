# Backend

## Stack
- Node.js + Express 5
- TypeScript
- Prisma ORM

## Folder Structure
- `backend/src/index.ts` - app bootstrap and core middleware wiring
- `backend/src/routes/` - route groups (`admin`, `instructor`, `student`, `courses`)
- `backend/src/controllers/` - controller layer for course/lesson endpoints
- `backend/src/services/` - business logic and data rules
- `backend/src/middleware/` - auth, CSRF, rate limit, error handling
- `backend/src/utils/` - shared HTTP and request helpers
- `backend/src/validation/` - payload validation helpers

## Backend Responsibilities
- Enforce auth, CSRF/origin checks, and RBAC
- Validate input
- Execute business rules (status transitions, ownership checks, moderation rules)
- Persist/retrieve data via Prisma
- Return consistent JSON responses and error contracts

## Backend Request Lifecycle
1. Request hits Express route.
2. Middleware chain runs:
   - CORS/origin
   - JSON parser
   - CSRF protection (mutating requests)
   - auth and role guards
3. Route/controller calls service logic.
4. Service uses Prisma to query/update DB.
5. Response returned as JSON.
6. Errors go to centralized `errorHandler`.
