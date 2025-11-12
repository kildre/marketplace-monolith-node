# Error Handling 

This document consolidates authentication and authorization error handling into one quick reference for the Marketplace backend.

## What goes where

- Authentication (401): The user could not be authenticated (missing/invalid/expired token, introspection issues).
  - Use: `AuthenticationError`
- Authorization (403): The user is authenticated but lacks required permissions/roles.
  - Use: `UnauthorizedUserError` (and its specializations if needed)

## Hierarchy

```
Error
└─ MarketplaceError
   ├─ AuthenticationError            # 401 / 5xx for auth flows
   └─ UnauthorizedUserError         # 403 for missing roles
      ├─ UnauthorizedAdjudicatorError
      └─ UnauthorizedRequestorError
```

## Common AuthenticationError codes

- `MISSING_TOKEN` – No bearer token provided
- `TOKEN_EXPIRED` – Token expired
- `TOKEN_NOT_YET_VALID` – Not-before (nbf) not reached
- `TOKEN_INACTIVE` – Introspection reports inactive
- `INTROSPECTION_FAILED` – Introspection HTTP error
- `INVALID_ISSUER` / `INVALID_AUDIENCE` – Claim mismatch 

All errors support:
- `toLogMessage()` for safe, structured server logs (no token contents)
- `toClientResponse()` for sanitized JSON responses

## Authorization (403) — role checks

Authorization ensures an authenticated user has the right permissions. In this app:

- Roles come from Keycloak token claims. The middleware may expose roles in `req.auth.roles`; otherwise, use `realm_access.roles`.
- Route guards should construct an `UnauthorizedUserError` with:
  - `userEmail` (usually `req.auth?.sub`)
  - `requiredRole` (env-configured role string)
  - `actualRoles` (the roles you evaluated)
- Always forward with `next(err)` so `errorHandler.ts` logs and formats the response consistently (403).

Minimal patterns:

```ts
import { UnauthorizedUserError } from "../domain/errors/UnauthorizedUserError";

// Either role allowed (ADJ_ROLE or REQ_ROLE)
if (!(roles.includes(ADJ_ROLE) || roles.includes(REQ_ROLE))) {
  return next(new UnauthorizedUserError("Adjudicator or requestor role required", {
    userEmail: req.auth?.sub || "unknown",
    requiredRole: `${ADJ_ROLE} or ${REQ_ROLE}`,
    actualRoles: roles,
  }));
}

// Adjudicator-only
if (!roles.includes(ADJ_ROLE)) {
  return next(new UnauthorizedUserError("Adjudicator role required", {
    userEmail: req.auth?.sub || "unknown",
    requiredRole: ADJ_ROLE,
    actualRoles: roles,
  }));
}

// Requestor-only
if (!roles.includes(REQ_ROLE)) {
  return next(new UnauthorizedUserError("Requestor role required", {
    userEmail: req.auth?.sub || "unknown",
    requiredRole: REQ_ROLE,
    actualRoles: roles,
  }));
}
```

Best practices:

- Treat authZ failures as 403 (not 401)
- Include required and actual roles for auditing; avoid leaking sensitive data
- Use `next(err)` and let `errorHandler.ts` return `err.toClientResponse()`

### In auth middleware (401 scenarios)

```ts
import { AuthenticationError } from "../domain/errors/AuthenticationError";

if (!token) {
  return next(AuthenticationError.missingToken(req.path, req.method, req.ip));
}

try {
  // throws AuthenticationError.expired/notYetValid/invalidIssuer/invalidAudience
  basicChecks(payload, EXPECTED_AUDIENCE, tokenHash);
} catch (err) {
  return next(err); // errorHandler will format/log
}
```

### In route guards (403 scenarios)

```ts
import { UnauthorizedUserError } from "../domain/errors/UnauthorizedUserError";

if (!roles.includes(REQUIRED_ROLE)) {
  return next(new UnauthorizedUserError("Required role missing", {
    userEmail: req.auth?.sub || "unknown",
    requiredRole: REQUIRED_ROLE,
    actualRoles: roles,
  }));
}
```

## Centralized error handling

`src/main/middleware/errorHandler.ts` handles both classes:
- `AuthenticationError` → logs `[AUTH_ERROR]`, returns 401/5xx
- `UnauthorizedUserError` → logs `[AUTHZ_ERROR]`, returns 403

Always prefer `next(err)` over sending responses directly so the error handler can:
- Log with `toLogMessage()`
- Send `toClientResponse()` consistently

## Logging & security notes

- Never log raw tokens; use hashed token identifiers passed into errors
- Keep auth vs authz distinct for accurate monitoring and client UX
- Include request context (path, method, ip) when constructing errors

