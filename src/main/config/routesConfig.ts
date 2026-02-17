// requestsGuard.ts
import { Router, Request, Response, NextFunction } from "express";
import log from "../service/loggingService";
import { UnauthorizedUserError } from "../domain/errors/UnauthorizedUserError";

const ADJ_ROLE = (process.env.MARKETPLACE_ADJUDICATOR_ROLE || "").trim();
const REQ_ROLE = (process.env.MARKETPLACE_REQUESTOR_ROLE || "").trim();

// Normalize: lower-case, strip trailing slashes, ensure leading slash
function norm(p: string): string {
  const cleaned = (p || "/").toLowerCase().replace(/\/+$/, "");
  return cleaned === "" ? "/" : cleaned;
}

// Extract realm roles placed by your introspection middleware
function getRealmRoles(req: Request): string[] {
  const kc = (req as any).kc || (req as any).auth || {};
  if (kc.realm_access?.roles) return kc.realm_access.roles as string[];
  if (Array.isArray(kc.roles)) return kc.roles as string[];
  return [];
}

function hasRole(roles: string[], needed: string): boolean {
  if (!needed) return false; // strict: role must be configured
  // Check for exact match OR prefixed format (e.g., "marketplace:marketplace-approver")
  return roles.includes(needed) || roles.some(r => r.endsWith(`:${needed}`));
}

export function requestsWhitelistGuard() {
  const guard = Router();

  guard.use((req, res, next) => {
    const user = (req as any).auth?.username || (req as any).kc?.username || "unknown";
    const userEmail = (req as any).auth?.sub || user;
    const npath = norm(req.path);
    const method = req.method.toUpperCase();
    const roles = getRealmRoles(req);

    // ---- STRICT WHITELIST ----
    // 1) Submit request: POST /api/requests → either role
    if (method === "POST" && npath === "/") {
      if (!ADJ_ROLE && !REQ_ROLE) {
        return next(new Error("Config error: roles not set"));
      }
      if (hasRole(roles, ADJ_ROLE) || hasRole(roles, REQ_ROLE)) return next();
      log.warn(`[DENY] ${user} lacks required role(s) for POST /api/requests`);
      return next(new UnauthorizedUserError(
        "Adjudicator or requestor role required",
        {
          userEmail,
          requiredRole: `${ADJ_ROLE} or ${REQ_ROLE}`,
          actualRoles: roles,
        }
      ));
    }

    // 2) View all: POST /api/requests/viewAll → adjudicator only
    if (method === "POST" && npath === "/viewall") {
      if (!ADJ_ROLE) return next(new Error("Config error: ADJ role not set"));
      if (hasRole(roles, ADJ_ROLE)) return next();
      log.warn(`[DENY] ${user} lacks ${ADJ_ROLE} for POST /api/requests/viewAll`);
      return next(new UnauthorizedUserError(
        "Adjudicator role required",
        {
          userEmail,
          requiredRole: ADJ_ROLE,
          actualRoles: roles,
        }
      ));
    }

    // 3) View pending: POST /api/requests/viewPending → adjudicator only
    if (method === "POST" && npath === "/viewpending") {
      if (!ADJ_ROLE) return next(new Error("Config error: ADJ role not set"));
      if (hasRole(roles, ADJ_ROLE)) return next();
      log.warn(`[DENY] ${user} lacks ${ADJ_ROLE} for POST /api/requests/viewPending`);
      return next(new UnauthorizedUserError(
        "Adjudicator role required",
        {
          userEmail,
          requiredRole: ADJ_ROLE,
          actualRoles: roles,
        }
      ));
    }

    // 4) View for request number: ANY /api/requests/viewForRequestNumber → either role
    if (npath === "/viewforrequestnumber") {
      if (!ADJ_ROLE && !REQ_ROLE) {
        return next(new Error("Config error: roles not set"));
      }
      if (hasRole(roles, ADJ_ROLE) || hasRole(roles, REQ_ROLE)) return next();
      log.warn(`[DENY] ${user} lacks required role(s) for ${method} /api/requests/viewForRequestNumber`);
      return next(new UnauthorizedUserError(
        "Adjudicator or requestor role required",
        {
          userEmail,
          requiredRole: `${ADJ_ROLE} or ${REQ_ROLE}`,
          actualRoles: roles,
        }
      ));
    }

    // 5) View for requestor: ANY /api/requests/viewForRequestor → requestor only
    if (npath === "/viewforrequestor") {
      if (!REQ_ROLE) return next(new Error("Config error: REQ role not set"));
      if (hasRole(roles, REQ_ROLE)) return next();
      log.warn(`[DENY] ${user} lacks ${REQ_ROLE} for ${method} /api/requests/viewForRequestor`);
      return next(new UnauthorizedUserError(
        "Requestor role required",
        {
          userEmail,
          requiredRole: REQ_ROLE,
          actualRoles: roles,
        }
      ));
    }

    // ---- DENY EVERYTHING ELSE UNDER /api/requests ----
    log.warn(`[DENY] ${user} → Denying access to /api/requests route not explicitly allowed: ${method} ${req.path}`);
    return next(new UnauthorizedUserError(
      "Route not explicitly allowed",
      {
        userEmail,
        requiredRole: "unknown",
        actualRoles: roles,
      }
    ));
  });

  return guard;
}
