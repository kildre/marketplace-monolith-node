import type { Request, Response, NextFunction } from "express";
import type { IntrospectionResult } from "../config/authConfig";
import log from "../service/loggingService";
import { UnauthorizedUserError } from "../domain/errors/UnauthorizedUserError";
import { AuthenticationError } from "../domain/errors/AuthenticationError";

// ============================================================================
// JWT & Token Utilities
// ============================================================================

/**
 * Decode JWT payload for diagnostics (no signature verification).
 * Returns null if token is not a valid JWT.
 */
export function decodeJwtPayload(token: string): any | null {
  try {
    const [, p] = token.split(".");
    if (!p) return null;
    const json = Buffer.from(p, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Extract Bearer token from Authorization header.
 * Returns null if header is missing or not in Bearer format.
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

// ============================================================================
// Introspection Payload Utilities
// ============================================================================

/**
 * Extract the Keycloak introspection payload attached by keycloakIntrospectMiddleware.
 */
export function extractAuth(req: Request): IntrospectionResult | undefined {
  return (req as any).auth as IntrospectionResult | undefined;
}

/**
 * Perform basic validation checks on introspection payload:
 * - Token expiration (exp)
 * - Issuer match (if expectedIssuer provided)
 * - Audience match (if expectedAudience provided)
 */
export function validateIntrospectionPayload(
  payload: IntrospectionResult,
  expectedAudience?: string,
  expectedIssuer?: string
): boolean {
  const now = Math.floor(Date.now() / 1000);
  
  // Check expiration
  if (typeof payload.exp === "number" && payload.exp <= now) {
    return false;
  }
  
  // Check issuer
  if (expectedIssuer && payload.iss !== expectedIssuer) {
    return false;
  }
  
  // Check audience
  if (expectedAudience) {
    const audiences = Array.isArray(payload.aud) 
      ? payload.aud 
      : [payload.aud].filter(Boolean);
    if (!audiences.includes(expectedAudience)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Attach flattened roles to the introspection payload.
 * Combines realm_access.roles and resource_access.<client>.roles.
 * Resource roles are prefixed with client name (e.g., "marketplace-ui:admin").
 */
export function attachRolesToPayload(payload: IntrospectionResult): void {
  const realmRoles = payload.realm_access?.roles || [];
  const resourceRoles = Object.entries(payload.resource_access || {}).flatMap(
    ([client, access]) => (access?.roles || []).map((role) => `${client}:${role}`)
  );
  (payload as any).roles = [...realmRoles, ...resourceRoles];
}

// ============================================================================
// Role Extraction & Checking
// ============================================================================

/**
 * Get a flattened list of roles from the introspection payload.
 * keycloakIntrospectMiddleware already flattens realm/resource roles into `roles`.
 */
export function getRoles(reqOrAuth: Request | IntrospectionResult | undefined): string[] {
  const auth = (isRequest(reqOrAuth) ? extractAuth(reqOrAuth as Request) : (reqOrAuth as IntrospectionResult)) as
    | IntrospectionResult
    | undefined;
  return (auth as any)?.roles ?? [];
}

export function hasRole(reqOrAuth: Request | IntrospectionResult | undefined, role: string): boolean {
  const roles = getRoles(reqOrAuth);
  return roles.includes(role);
}

export function hasAnyRole(reqOrAuth: Request | IntrospectionResult | undefined, rolesNeeded: string[]): boolean {
  const roles = getRoles(reqOrAuth);
  return rolesNeeded.some((r) => roles.includes(r));
}

export function hasAllRoles(reqOrAuth: Request | IntrospectionResult | undefined, rolesNeeded: string[]): boolean {
  const roles = getRoles(reqOrAuth);
  return rolesNeeded.every((r) => roles.includes(r));
}

// ============================================================================
// Express Middleware
// ============================================================================

/**
 * Middleware to require at least one of the provided roles.
 * Responds with 403 when requirements are not met.
 * If no roles provided (or all undefined), acts as pass-through.
 */
export function requireRoles(...needed: (string | undefined)[]) {
  // Filter out undefined/empty values
  const validRoles = needed.filter(Boolean) as string[];
  
  return (req: Request, res: Response, next: NextFunction) => {
    // If no valid roles specified, allow through (token still required by parent middleware)
    if (validRoles.length === 0) {
      return next();
    }
    
    const roles = getRoles(req);
    const ok = validRoles.some((r) => roles.includes(r));
    
    // eslint-disable-next-line no-console
    log.debug(`[ROLES] need: ${JSON.stringify(validRoles)} have: ${JSON.stringify(roles)} ok: ${ok}`);
    
    if (!ok) {
      const required = validRoles.length === 1 ? validRoles[0] : validRoles.join(" OR ");
      const err = new UnauthorizedUserError("Forbidden: missing roles", {
        userEmail: (req as any).auth?.sub || (req as any).kc?.username || "unknown",
        requiredRole: required,
        actualRoles: roles,
      });
      return next(err);
    }
    
    next();
  };
}

/**
 * Ensure request has an active introspected token. Use when a route is not under the global /api guard.
 */
export function requireActiveToken() {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = extractAuth(req);
    if (!auth) {
      // No introspection payload present – treat as missing token for routes outside global guard
      const err = AuthenticationError.missingToken(req.path, req.method, req.ip);
      return next(err);
    }
    if (auth.active === false) {
      const tokenSub = auth.sub || "unknown";
      const err = AuthenticationError.inactive(tokenSub, req.path);
      return next(err);
    }
    next();
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function isRequest(v: any): v is Request {
  return v && typeof v === "object" && "headers" in v && "method" in v;
}

/**
 * Get current Unix timestamp in seconds.
 */
export function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
