# Auth and Security

## Authentication Model
- JWT is issued by backend auth endpoints.
- Token is stored in an `HttpOnly` auth cookie.
- Frontend session hydration uses `GET /me`.

## Cookie-Based Auth
- Cookie name configurable (`AUTH_COOKIE_NAME`).
- Cookie policy configurable (`AUTH_COOKIE_SAMESITE`).
- Production requires secure cookie settings.

## CSRF Protection
- CSRF token issued by `GET /auth/csrf`.
- Mutating requests must include matching CSRF cookie + header.
- Backend enforces origin allowlist for mutating methods.

## RBAC Roles
- `ADMIN`: full moderation and operations
- `INSTRUCTOR`: own-course authoring and approvals
- `STUDENT`: learning and enrollment requests
- Role gates are enforced both in backend routes and frontend guarded routes.

## Audit Logging
- Moderation/security actions write to `AuditLog`.
- Logs include actor, action, entity, metadata, and request context where available.

## Security Principles
- Default deny for unauthorized role access.
- Validate and normalize payloads.
- Rate limit sensitive auth flows.
- Keep standardized error contract for predictable handling.
