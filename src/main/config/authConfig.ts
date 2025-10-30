import type { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";
import log from "../service/loggingService";

// ───────────────────────── Env & constants ─────────────────────────
const ADJ_ROLE = (process.env.MARKETPLACE_ADJUDICATOR_ROLE || "").trim();

const {
  KEYCLOAK_BASE_URL,
  KEYCLOAK_REALM,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  EXPECTED_AUDIENCE,
} = process.env;

// ───────────────────────── Cache ─────────────────────────
type CacheEntry = { payload: IntrospectionResult; exp: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(token: string) {
  return token.slice(0, 24);
}
function putCache(token: string, payload: IntrospectionResult) {
  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === "number" ? payload.exp : now + 30;
  const ttl = Math.max(0, exp - now - 5); // 5s safety
  if (ttl > 0) cache.set(cacheKey(token), { payload, exp });
}
function getCache(token: string): IntrospectionResult | undefined {
  const k = cacheKey(token);
  const entry = cache.get(k);
  const now = Math.floor(Date.now() / 1000);
  if (entry && entry.exp > now) return entry.payload;
  if (entry) cache.delete(k);
  return undefined;
}

// ───────────────────────── Types ─────────────────────────
export interface IntrospectionResult {
  active: boolean;
  exp?: number;
  iat?: number;
  nbf?: number;
  scope?: string;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
  typ?: string;
  azp?: string;
  client_id?: string;
  username?: string;
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  // …plus any custom claims
}

// ───────────────────────── Helpers ─────────────────────────
function rolesFromPayload(p: IntrospectionResult): string[] {
  const rr = p.realm_access?.roles ?? [];
  const cr = Object.entries(p.resource_access ?? {}).flatMap(([client, v]) =>
    (v?.roles ?? []).map((role) => `${client}:${role}`)
  );
  log.debug("rolesFromPayload: " + JSON.stringify({ realmRoles: rr, clientRoles: cr }));
  return [...rr, ...cr];
}

function basicChecks(payload: IntrospectionResult, expectedAudience?: string): boolean {
  const now = Math.floor(Date.now() / 1000);

  if (typeof payload.exp === "number" && payload.exp <= now) {
    log.warn(`Token expired at ${payload.exp} now ${now}`);
    return false;
  }

  // Issuer sanity — keep lenient unless EXPECTED_ISSUER is enforced elsewhere
  if (payload.iss && !payload.iss.includes("/realms/")) {
    log.error(`Unexpected issuer: ${payload.iss}`);
  }

  if (expectedAudience) {
    const audArr = Array.isArray(payload.aud) ? payload.aud : [payload.aud].filter(Boolean);
    if (!audArr.includes(expectedAudience)) {
      log.error(`Audience mismatch. aud= ${audArr}, expected= ${expectedAudience}`);
      return false;
    }
  }
  return true;
}

function logRoles(payload: IntrospectionResult) {
  const rr = payload.realm_access?.roles || [];
  const cr = Object.entries(payload.resource_access || {}).flatMap(([client, v]) =>
    (v?.roles || []).map((r) => `${client}:${r}`)
  );
  log.debug(`realm roles: ${JSON.stringify(rr)}`);
  log.debug(`resource roles: ${JSON.stringify(cr)}`);
  (payload as any).roles = [...rr, ...cr];
}

// ───────────────────────── Public auth helpers (EXPORTED) ─────────────────────────
/**
 * Return the Bearer token from the request (does not validate it).
 * Works with JWT and opaque tokens. Never rejects opaque tokens.
 */
export function getAuthToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return undefined;
  }
  const token = auth.substring("Bearer ".length).trim();

  // Try to log a few hints if JWT; do not fail on opaque tokens.
  try {
    const [, p] = token.split(".");
    if (p) {
      const j = JSON.parse(Buffer.from(p, "base64").toString("utf8"));
  log.debug(`token-hints typ: ${j.typ} azp: ${j.azp} aud: ${JSON.stringify(j.aud)} exp: ${j.exp} iss: ${j.iss}`);
    }
  } catch {
    log.error("Failed to parse token hints; assuming opaque token");
    return undefined
  }

  return token;
}

/**
 * True if the cached payload for this token includes the adjudicator role from env.
 * Returns false if no cache yet or env role is not set.
 */
export function isAuthorizedAdjudicator(token: string): boolean {
  if (!ADJ_ROLE) return false;
  const payload = getCache(token);
  if (!payload) return false;
  const roles = rolesFromPayload(payload);
  return roles.includes(ADJ_ROLE);
}

/**
 * Your current policy: any authenticated/cached token is considered a requestor.
 * If you want to enforce a specific role later, change this to check roles.
 */
export function isAuthorizedRequestor(token: string): boolean {
  const payload = getCache(token);
  return !!(payload && payload.active !== false); // treat cached active (or unset active) as OK
}

// ───────────────────────── Middleware ─────────────────────────
export function keycloakIntrospectMiddleware(required = true) {
  if (!KEYCLOAK_BASE_URL || !KEYCLOAK_REALM || !KEYCLOAK_CLIENT_ID || !KEYCLOAK_CLIENT_SECRET) {
    throw new Error("Missing Keycloak env vars. Please set KEYCLOAK_* values.");
  }

  const base = KEYCLOAK_BASE_URL.replace(/\/+$/, "");
  const introspectUrl = `${base}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token/introspect`;

  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      const token = getAuthToken(req);
      if (!token) {
        if (required) return res.status(401).json({ error: "Missing token" });
        return next();
      }
  log.debug(`[INTROSPECT] Token received: ${token.substring(0, 8)}...`);
      // Cache first
      const cached = getCache(token);
      if (cached) {
        if (required && cached.active === false) {
          return res.status(401).json({ error: "Token inactive" });
        }
        if (!basicChecks(cached, EXPECTED_AUDIENCE)) {
          return res.status(403).json({ error: "Token check failed" });
        }
        (req as any).auth = cached;
        logRoles(cached);
        return next();
      }

      // Call introspection
      const form = new URLSearchParams({
        token,
        client_id: KEYCLOAK_CLIENT_ID,
        client_secret: KEYCLOAK_CLIENT_SECRET,
        token_type_hint: "access_token",
      });

      const resp = await fetch(introspectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: form as any, // node-fetch v2 accepts URLSearchParams
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
  log.debug(`HTTP ${resp.status} ${text?.slice(0, 500) ?? ''}`);
        return res.status(401).json({ error: "Introspection failed" });
      }

      const payload = (await resp.json()) as IntrospectionResult;
  log.debug(`active: ${payload.active} iss: ${payload.iss}`);

      if (required && payload.active === false) {
        return res.status(401).json({ error: "Token inactive" });
      }
      if (!basicChecks(payload, EXPECTED_AUDIENCE)) {
        return res.status(403).json({ error: "Token check failed" });
      }

      putCache(token, payload);
      (req as any).auth = payload;
      logRoles(payload);
      return next();
    } catch (err: any) {
  log.error(`[INTROSPECT] Exception: ${err?.message || String(err)}`);
      return res.status(500).json({ error: "Introspection exception" });
    }
  };
}
