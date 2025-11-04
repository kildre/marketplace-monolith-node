import type { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";
import * as crypto from "crypto";
import log from "../service/loggingService";

// ───────────────────────── Env & constants ─────────────────────────
const ADJ_ROLE = (process.env.MARKETPLACE_ADJUDICATOR_ROLE || "").trim();

// allow either var name
function isTrue(v?: string): boolean {
  return typeof v === "string" && /^(1|true|yes|y|on)$/i.test(v.trim());
}
const BYPASS_AUTH =
  isTrue(process.env.MARKETPLACE_BYPASS_AUTH);

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

function cacheKey(token: string): string {
  // safer than slicing raw token
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 24);
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
  if (expectedAudience) {
    const audArr = Array.isArray(payload.aud) ? payload.aud : [payload.aud].filter(Boolean);
    if (!audArr.includes(expectedAudience)) {
      log.error(`Audience mismatch. aud=${JSON.stringify(audArr)} expected=${expectedAudience}`);
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
export function getAuthToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return undefined;
  const token = auth.substring("Bearer ".length).trim();

  // Log hints if JWT; keep opaque tokens working
  try {
    const [, p] = token.split(".");
    if (p) {
      const j = JSON.parse(Buffer.from(p, "base64").toString("utf8"));
      const hash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
      log.debug(`token-hints hash=${hash} typ=${j.typ} azp=${j.azp} aud=${JSON.stringify(j.aud)} exp=${j.exp} iss=${j.iss}`);
    }
  } catch {
    const hash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
    log.debug(`opaque-token hash=${hash}`);
  }

  return token;
}

/** True if cached token has adjudicator role. */
export function isAuthorizedAdjudicator(token: string): boolean {
  if (BYPASS_AUTH) return true; // everyone passes in bypass mode
  if (!ADJ_ROLE) return false;
  const payload = getCache(token);
  if (!payload) return false;
  const roles = rolesFromPayload(payload);
  return roles.includes(ADJ_ROLE);
}

/** Current policy: any cached/active token is a requestor. */
export function isAuthorizedRequestor(token: string): boolean {
  if (BYPASS_AUTH) return true;
  const payload = getCache(token);
  return !!(payload && payload.active !== false);
}

// ───────────────────────── Middleware ─────────────────────────
export function keycloakIntrospectMiddleware(required = true) {
  // If bypassing, do NOT require Keycloak env vars.
  if (!BYPASS_AUTH) {
    if (!KEYCLOAK_BASE_URL || !KEYCLOAK_REALM || !KEYCLOAK_CLIENT_ID || !KEYCLOAK_CLIENT_SECRET) {
      throw new Error("Missing Keycloak env vars. Please set KEYCLOAK_* values.");
    }
  }

  const base = (KEYCLOAK_BASE_URL || "").replace(/\/+$/, "");
  const introspectUrl = `${base}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token/introspect`;

  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      // BYPASS: attach a synthetic auth payload and continue
      if (BYPASS_AUTH) {
        const roles = ADJ_ROLE ? [ADJ_ROLE] : [];
        const fake: IntrospectionResult = {
          active: true,
          sub: "bypass-user",
          azp: "bypass-client",
          iss: base && KEYCLOAK_REALM ? `${base}/realms/${KEYCLOAK_REALM}` : "https://bypass.local/realms/example",
          aud: EXPECTED_AUDIENCE || undefined,
          realm_access: roles.length ? { roles } : undefined,
          resource_access: {},
        };
        (req as any).auth = fake;
        (req as any).auth.roles = roles;
        log.warn(`[INTROSPECT] BYPASS enabled. Skipping Keycloak; roles=${JSON.stringify(roles)}`);
        return next();
      }

      const token = getAuthToken(req);
      if (!token) {
        if (required) return res.status(401).json({ error: "Missing token" });
        return next();
      }

      // Cache first
      const cached = getCache(token);
      if (cached) {
        if (required && cached.active === false) return res.status(401).json({ error: "Token inactive" });
        if (!basicChecks(cached, EXPECTED_AUDIENCE)) return res.status(403).json({ error: "Token check failed" });
        (req as any).auth = cached;
        logRoles(cached);
        return next();
      }

      // Call introspection
      const form = new URLSearchParams({
        token,
        client_id: KEYCLOAK_CLIENT_ID || "",
        client_secret: KEYCLOAK_CLIENT_SECRET || "",
        token_type_hint: "access_token",
      });

      const resp = await fetch(introspectUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: form as any, // node-fetch v2 accepts URLSearchParams
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        log.debug(`HTTP ${resp.status} ${text?.slice(0, 500) ?? ""}`);
        return res.status(401).json({ error: "Introspection failed" });
      }

      const payload = (await resp.json()) as IntrospectionResult;
      if (required && payload.active === false) return res.status(401).json({ error: "Token inactive" });
      if (!basicChecks(payload, EXPECTED_AUDIENCE)) return res.status(403).json({ error: "Token check failed" });

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
