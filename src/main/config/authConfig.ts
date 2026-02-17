import type { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";
import * as https from "https";
import * as crypto from "crypto";
import log from "../service/loggingService";
import { AuthenticationError } from "../domain/errors/AuthenticationError";
import { SessionTokenService } from "../service/sessionTokenService";
import marketplaceUserDao from "../rdbms/dao/marketplaceUserDao";

// ───────────────────────── Env & constants ─────────────────────────
const ADJ_ROLE = (process.env.MARKETPLACE_ADJUDICATOR_ROLE || "").trim();
const REQ_ROLE = (process.env.MARKETPLACE_REQUESTOR_ROLE || "").trim();
const USE_CLIENT_SESSION_STORAGE = isTrue(
  process.env.USE_CLIENT_SESSION_STORAGE
);

const CACHE_KEY_LENGTH = 24;
const MAX_CACHE_SIZE = 1000;
const TOKEN_CACHE_SAFETY_MARGIN_SEC = parseInt(
  process.env.TOKEN_CACHE_SAFETY_MARGIN_SEC || "10",
  10
);

function isTrue(v?: string): boolean {
  return typeof v === "string" && /^(1|true|yes|y|on)$/i.test(v.trim());
}
const BYPASS_AUTH = isTrue(process.env.KEYCLOAK_BYPASS_AUTH);

// ───────────────────────── Mock Token Handling ─────────────────────────
/**
 * Detect if a token is a mock token from the frontend
 * Mock tokens have the format: mock.base64payload.signature
 */
function isMockToken(token: string): boolean {
  return token.startsWith('mock.');
}

/**
 * Parse mock token and create introspection result
 * This allows the frontend's mock Keycloak provider to send realistic tokens
 * with different users, roles, and attributes for testing
 */
function parseMockToken(token: string): IntrospectionResult {
  try {
    // Token format: mock.base64payload.signature
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'mock') {
      throw new Error('Invalid mock token format - expected mock.payload.signature');
    }

    // Decode the base64 payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

    log.debug(`[AUTH] Parsing mock token: sub=${payload.sub}, email=${payload.email}`);

    // Create introspection result from mock payload
    const result: IntrospectionResult = {
      active: true,
      sub: payload.sub || 'mock-user',
      email: payload.email || 'mock@local.dev',
      exp: payload.exp,
      iat: payload.iat,
      iss: payload.iss,
      aud: payload.aud,
      azp: payload.azp || 'mock-client',
      realm_access: payload.realm_access,
      resource_access: payload.resource_access,
      username: payload.preferred_username,
    };

    return result;
  } catch (error) {
    log.error(`[AUTH] Failed to parse mock token: ${error instanceof Error ? error.message : String(error)}`);
    throw AuthenticationError.invalidFormat('Invalid mock token format');
  }
}

// Log bypass configuration at startup for audit trail
if (BYPASS_AUTH) {
  log.warn(
    `[AUTH_CONFIG] Keycloak authentication BYPASS enabled via KEYCLOAK_BYPASS_AUTH`
  );
} else {
  log.info(`[AUTH_CONFIG] Keycloak authentication enabled, bypass disabled`);
}

const {
  KEYCLOAK_BASE_URL,
  KEYCLOAK_REALM,
  KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET,
  EXPECTED_AUDIENCE,
} = process.env;

// Validate HTTPS in production
if (
  process.env.NODE_ENV === "production" &&
  KEYCLOAK_BASE_URL &&
  !KEYCLOAK_BASE_URL.startsWith("https://")
) {
  throw new Error("KEYCLOAK_BASE_URL must use HTTPS in production");
}

// ───────────────────────── Cache ─────────────────────────
type CacheEntry = { payload: IntrospectionResult; exp: number };
const cache = new Map<string, CacheEntry>();

function cacheKey(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex")
    .substring(0, CACHE_KEY_LENGTH);
}

function putCache(token: string, payload: IntrospectionResult): void {
  const now = Math.floor(Date.now() / 1000);
  const exp = typeof payload.exp === "number" ? payload.exp : now + 30;
  const ttl = Math.max(0, exp - now - TOKEN_CACHE_SAFETY_MARGIN_SEC);

  if (ttl > 0) {
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
        log.info(
          `[CACHE] LRU eviction: size=${cache.size}, max=${MAX_CACHE_SIZE}`
        );
      }
    }
    cache.set(cacheKey(token), { payload, exp });
    log.info(
      `[CACHE] Token cached: sub=${payload.sub}, ttl=${ttl}s, size=${cache.size}`
    );
  } else {
    log.warn(`[CACHE] Token not cached (ttl=${ttl}): sub=${payload.sub}`);
  }
}

export function getCache(token: string): IntrospectionResult | undefined {
  const k = cacheKey(token);
  const entry = cache.get(k);
  const now = Math.floor(Date.now() / 1000);
  if (entry && entry.exp > now) {
    log.debug(
      `[CACHE] Cache hit: sub=${entry.payload.sub}, remaining_ttl=${
        entry.exp - now
      }s`
    );
    return entry.payload;
  }
  if (entry) {
    log.info(
      `[CACHE] Cache expired: sub=${entry.payload.sub}, exp=${entry.exp}, now=${now}`
    );
    cache.delete(k);
  }
  return undefined;
}

function cleanupCache(): void {
  const now = Math.floor(Date.now() / 1000);
  let cleaned = 0;
  for (const [key, entry] of cache.entries()) {
    if (entry.exp <= now) {
      cache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    log.debug(
      `[CACHE] Cleaned ${cleaned} expired entries, size: ${cache.size}`
    );
  }
}

const cacheCleanupInterval = setInterval(cleanupCache, 60_000);

// Allow the process to exit even if the interval is still scheduled (useful for Jest tests)
if (typeof (cacheCleanupInterval as any)?.unref === "function") {
  (cacheCleanupInterval as any).unref();
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
  // Require email. If it isn't present, we won't be able to process the request anyway.
  email: string; 
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      auth?: IntrospectionResult & { roles?: string[] };
    }
  }
}

// ───────────────────────── Helpers ─────────────────────────
function rolesFromPayload(p: IntrospectionResult): string[] {
  const rr = p.realm_access?.roles ?? [];
  const cr = Object.entries(p.resource_access ?? {}).flatMap(([client, v]) =>
    (v?.roles ?? []).map((role) => `${client}:${role}`)
  );
  log.debug(
    "rolesFromPayload: " + JSON.stringify({ realmRoles: rr, clientRoles: cr })
  );
  return [...rr, ...cr];
}

function basicChecks(
  payload: IntrospectionResult,
  expectedAudience?: string,
  tokenHash?: string
): void {
  const now = Math.floor(Date.now() / 1000);

  // not-before
  if (typeof payload.nbf === "number" && now < payload.nbf) {
    log.warn(
      `[AUTH_VALIDATION] Token not-before check failed: sub=${payload.sub}, nbf=${payload.nbf}, now=${now}`
    );
    throw AuthenticationError.notYetValid(
      payload.sub || "unknown",
      payload.nbf,
      now,
      tokenHash
    );
  }

  // expiration
  if (typeof payload.exp === "number" && payload.exp <= now) {
    log.warn(
      `[AUTH_VALIDATION] Token expiration check failed: sub=${payload.sub}, exp=${payload.exp}, now=${now}`
    );
    throw AuthenticationError.expired(
      payload.sub || "unknown",
      payload.exp,
      now,
      tokenHash
    );
  }

  // issuer
  if (KEYCLOAK_BASE_URL && KEYCLOAK_REALM) {
    const expectedIssuer = `${KEYCLOAK_BASE_URL.replace(
      /\/+$/,
      ""
    )}/realms/${KEYCLOAK_REALM}`;
    if (payload.iss && payload.iss !== expectedIssuer) {
      log.error(
        `[AUTH_VALIDATION] Issuer validation failed: sub=${payload.sub}, got="${payload.iss}", expected="${expectedIssuer}"`
      );
      throw AuthenticationError.invalidIssuer(
        payload.sub || "unknown",
        payload.iss,
        expectedIssuer,
        tokenHash
      );
    }
  }

  // audience
  if (expectedAudience) {
    const audArr = Array.isArray(payload.aud)
      ? payload.aud
      : [payload.aud].filter(Boolean);
    if (!audArr.includes(expectedAudience)) {
      log.error(
        `[AUTH_VALIDATION] Audience validation failed: sub=${
          payload.sub
        }, aud=${JSON.stringify(audArr)}, expected="${expectedAudience}"`
      );
      throw AuthenticationError.invalidAudience(
        payload.sub || "unknown",
        payload.aud || [],
        expectedAudience,
        tokenHash
      );
    }
  }

  log.info(
    `[AUTH_VALIDATION] Token validation passed: sub=${payload.sub}, azp=${payload.azp}, iss=${payload.iss}`
  );
}

function logRoles(payload: IntrospectionResult & { roles?: string[] }): void {
  const rr = payload.realm_access?.roles || [];
  const cr = Object.entries(payload.resource_access || {}).flatMap(
    ([client, v]) => (v?.roles || []).map((r) => `${client}:${r}`)
  );
  log.debug(
    `[AUTH] sub=${payload.sub}, azp=${
      payload.azp
    }, realm_roles=${JSON.stringify(rr)}, resource_roles=${JSON.stringify(cr)}`
  );
  payload.roles = [...rr, ...cr];
}

// ───────────────────────── Public auth helpers ─────────────────────────
export async function getAuthToken(req: Request): Promise<string | undefined> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return undefined;
  const token = auth.substring("Bearer ".length).trim();
  if (USE_CLIENT_SESSION_STORAGE && !req.path.includes("/session/register")) {
    const sessionService = new SessionTokenService();
    const storedToken = await sessionService.getActiveOrAnyBySessionId(token);
    if (!storedToken) {
      log.warn(`[AUTH] No stored token found for sessionId=${token}`);
      return undefined;
    }

    return storedToken.accessToken;
  }

  try {
    const [, p] = token.split(".");
    if (p) {
      const j = JSON.parse(Buffer.from(p, "base64").toString("utf8"));
      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex")
        .substring(0, 16);
      log.debug(
        `[AUTH] JWT token hash=${tokenHash}, typ=${j.typ}, azp=${
          j.azp
        }, aud=${JSON.stringify(j.aud)}, exp=${j.exp}, iss=${j.iss}`
      );
    }
  } catch {
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")
      .substring(0, 16);
    log.debug(`[AUTH] Opaque token hash=${tokenHash}`);
  }
  return token;
}

export function isAuthorizedAdjudicator(token: string): boolean {
  if (BYPASS_AUTH) {
    log.info(
      `[AUTH_CHECK] isAuthorizedAdjudicator: BYPASS mode, returning true`
    );
    return true;
  }

  if (!ADJ_ROLE) {
    log.warn(
      `[AUTH_CHECK] isAuthorizedAdjudicator: no ADJ_ROLE configured, returning false`
    );
    return false;
  }

  const payload = getCache(token);
  if (!payload) {
    log.info(
      `[AUTH_CHECK] isAuthorizedAdjudicator: no cached payload for token, returning false`
    );
    return false;
  }
  const roles = rolesFromPayload(payload);
  const hasRole = roles.includes(ADJ_ROLE);
  log.info(
    `[AUTH_CHECK] isAuthorizedAdjudicator: sub=${payload.sub}, hasRole=${hasRole}, requiredRole=${ADJ_ROLE}`
  );
  return hasRole;
}

export function isAuthorizedRequestor(token: string): boolean {
  if (BYPASS_AUTH) {
    log.info(`[AUTH_CHECK] isAuthorizedRequestor: BYPASS mode, returning true`);
    return true;
  }

  const payload = getCache(token);
  if (!payload) {
    log.info(
      `[AUTH_CHECK] isAuthorizedRequestor: no cached payload for token, returning false`
    );
    return false;
  }

  const roles = rolesFromPayload(payload);

  // Check for requestor role if configured, if not return true
  if (REQ_ROLE) {
    const hasRole = roles.includes(REQ_ROLE);
    log.info(
      `[AUTH_CHECK] isAuthorizedRequestor: sub=${payload.sub}, hasRole=${hasRole}, requiredRole=${REQ_ROLE}`
    );
    return hasRole;
  }
  return true;
}

// ───────────────────────── HTTP Agent ─────────────────────────
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  // Note: per-request timeouts should be handled with AbortController; this is fine for pooling.
});

// ───────────────────────── Middleware ─────────────────────────
export function keycloakIntrospectMiddleware(required = true) {
  let base = "";
  let introspectUrl = "";

  if (!BYPASS_AUTH) {
    if (
      !KEYCLOAK_BASE_URL ||
      !KEYCLOAK_REALM ||
      !KEYCLOAK_CLIENT_ID ||
      !KEYCLOAK_CLIENT_SECRET
    ) {
      throw new Error(
        "Missing Keycloak env vars. Please set KEYCLOAK_* values."
      );
    }
    base = KEYCLOAK_BASE_URL.replace(/\/+$/, "");
    introspectUrl = `${base}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token/introspect`;
  }

  return async function (req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // In bypass mode, check if there's a token first to determine behavior
    if (BYPASS_AUTH) {
      try {
        const token = await getAuthToken(req);

        // If token exists and is a mock token, parse it for user-specific info
        if (token && isMockToken(token)) {
          log.info(`[AUTH_BYPASS] Mock token detected, parsing payload`);
          const mockPayload = parseMockToken(token);
          const roles = rolesFromPayload(mockPayload);
          (mockPayload as IntrospectionResult & { roles?: string[] }).roles = roles;
          req.auth = mockPayload as IntrospectionResult & { roles?: string[] };

          log.warn(
            `[AUTH_BYPASS] Mock token authenticated: email=${mockPayload.email}, sub=${mockPayload.sub}, roles=${JSON.stringify(roles)}, path=${req.path}, method=${req.method}`
          );

          return forwardToRouter(mockPayload, req, next);
        }

        // Otherwise, use the default bypass user (fallback for backward compatibility)
        const fakeIssuer =
          KEYCLOAK_BASE_URL && KEYCLOAK_REALM
            ? `${KEYCLOAK_BASE_URL.replace(/\/+$/, "")}/realms/${KEYCLOAK_REALM}`
            : `https://bypass.local/realms/example`;
        const roles: string[] = [];
        if (ADJ_ROLE) roles.push(ADJ_ROLE);
        if (REQ_ROLE) roles.push(REQ_ROLE);
        const fake: IntrospectionResult & { roles?: string[] } = {
          active: true,
          sub: "bypass-user",
          azp: "bypass-client",
          iss: fakeIssuer,
          aud: EXPECTED_AUDIENCE || undefined,
          realm_access: roles.length ? { roles } : undefined,
          resource_access: {},
          email: "bypass-user@metrostar.com",
        };
        fake.roles = roles;
        req.auth = fake;
        log.warn(
          `[AUTH_BYPASS] Request authenticated via global bypass mode: sub=bypass-user, roles=${JSON.stringify(
            roles
          )}, path=${req.path}, method=${req.method}`
        );
        return forwardToRouter(fake, req, next);
      } catch (error) {
        log.error(`[AUTH_BYPASS] Error in bypass mode: ${error instanceof Error ? error.message : String(error)}`);
        // If there's an error parsing, fall back to default bypass user
        const fakeIssuer =
          KEYCLOAK_BASE_URL && KEYCLOAK_REALM
            ? `${KEYCLOAK_BASE_URL.replace(/\/+$/, "")}/realms/${KEYCLOAK_REALM}`
            : `https://bypass.local/realms/example`;
        const roles: string[] = [];
        if (ADJ_ROLE) roles.push(ADJ_ROLE);
        if (REQ_ROLE) roles.push(REQ_ROLE);
        const fake: IntrospectionResult & { roles?: string[] } = {
          active: true,
          sub: "bypass-user",
          azp: "bypass-client",
          iss: fakeIssuer,
          aud: EXPECTED_AUDIENCE || undefined,
          realm_access: roles.length ? { roles } : undefined,
          resource_access: {},
          email: "bypass-user@metrostar.com",
        };
        fake.roles = roles;
        req.auth = fake;
        return forwardToRouter(fake, req, next);
      }
    }

    try {
      const token = await getAuthToken(req);
      if (!token) {
        if (required) {
          log.warn(
            `[AUTH_ATTEMPT] Authentication required but no token provided: path=${req.path}, method=${req.method}, ip=${req.ip}`
          );
          const error = AuthenticationError.missingToken(
            req.path,
            req.method,
            req.ip
          );
          log.warn(error.toLogMessage());
          return next(error);
        }
        log.info(
          `[AUTH_ATTEMPT] No token provided, but not required: path=${req.path}, method=${req.method}`
        );
        return next();
      }

      const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex")
        .substring(0, 16);
      log.info(
        `[AUTH_ATTEMPT] Processing authentication: tokenHash=${tokenHash}, path=${req.path}, method=${req.method}, ip=${req.ip}`
      );

      // Cache first
      const cached = getCache(await token);
      if (cached) {
        log.info(
          `[AUTH_SUCCESS] Cache hit: sub=${cached.sub}, azp=${
            cached.azp
          }, latency=${Date.now() - startTime}ms, path=${req.path}`
        );
        if (required && cached.active === false) {
          log.warn(
            `[AUTH_FAILURE] Cached token inactive: sub=${cached.sub}, path=${req.path}`
          );
          const error = AuthenticationError.inactive(
            cached.sub || "unknown",
            req.path,
            tokenHash
          );
          log.warn(error.toLogMessage());
          return next(error);
        }

        try {
          basicChecks(cached, EXPECTED_AUDIENCE, tokenHash);
        } catch (error) {
          if (error instanceof AuthenticationError) {
            log.warn(
              `[AUTH_FAILURE] Cached token validation failed: ${error.toLogMessage()}`
            );
          }
          return next(error); // All errors should be forwarded to the error handler middleware
        }

        req.auth = cached as IntrospectionResult & { roles?: string[] };
        logRoles(req.auth);
        let currentUser = await marketplaceUserDao.findByEmail(cached.email);
        req.currentUser = currentUser;

        return next();
      }

      log.info(
        `[AUTH_ATTEMPT] Cache miss, introspecting with Keycloak: tokenHash=${tokenHash}, path=${req.path}`
      );

      const form = new URLSearchParams();
      form.append("token", token);
      form.append("client_id", KEYCLOAK_CLIENT_ID || "");
      form.append("client_secret", KEYCLOAK_CLIENT_SECRET || "");
      form.append("token_type_hint", "access_token");

      const resp = await fetch(introspectUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: form as any, // node-fetch v2 accepts URLSearchParams
        agent: introspectUrl.startsWith("https")
          ? (httpsAgent as any)
          : undefined,
      });

      const latency = Date.now() - startTime;
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        log.error(
          `[AUTH_FAILURE] Keycloak introspection failed: status=${
            resp.status
          }, latency=${latency}ms, path=${req.path}, response_preview=${
            text?.slice(0, 200) ?? ""
          }`
        );
        const error = AuthenticationError.introspectionFailed(
          resp.status,
          text?.slice(0, 200) ?? "",
          req.path,
          tokenHash
        );
        log.error(error.toLogMessage());
        return next(error);
      }

      const payload = (await resp.json()) as IntrospectionResult;
      log.info(
        `[AUTH_ATTEMPT] Keycloak response: active=${payload.active}, sub=${payload.sub}, iss=${payload.iss}, latency=${latency}ms`
      );

      if (required && payload.active === false) {
        log.warn(
          `[AUTH_FAILURE] Introspected token inactive: sub=${payload.sub}, path=${req.path}`
        );
        const error = AuthenticationError.inactive(
          payload.sub || "unknown",
          req.path,
          tokenHash
        );
        log.warn(error.toLogMessage());
        return next(error);
      }

      try {
        basicChecks(payload, EXPECTED_AUDIENCE, tokenHash);
      } catch (error) {
        if (error instanceof AuthenticationError) {
          log.warn(
            `[AUTH_FAILURE] Introspected token validation failed: ${error.toLogMessage()}`
          );
          return next(error);
        }
        throw error; // Re-throw if not AuthenticationError
      }
      putCache(token, payload);
      req.auth = payload as IntrospectionResult & { roles?: string[] };
      logRoles(req.auth);
      log.info(
        `[AUTH_SUCCESS] Authentication successful: sub=${payload.sub}, azp=${
          payload.azp
        }, total_latency=${Date.now() - startTime}ms, path=${
          req.path
        }, method=${req.method}`
      );
      return forwardToRouter(payload, req, next);
    } catch (err: any) {
      const latency = Date.now() - startTime;

      // Handle AuthenticationError instances that might be re-thrown
      if (err instanceof AuthenticationError) {
        log.error(
          `[AUTH_ERROR] Authentication error: latency=${latency}ms, ${err.toLogMessage()}`
        );
        return next(err);
      }

      // Handle all other exceptions as internal errors
      log.error(
        `[AUTH_ERROR] Authentication exception: latency=${latency}ms, path=${
          req.path
        }, method=${req.method}, error=${
          err?.message || String(err)
        }, stack=${err?.stack?.slice(0, 200)}`
      );
      const error = AuthenticationError.internalError(
        err?.message || String(err),
        req.path,
        req.method,
        err
      );
      return next(error);
    }
  };
}

async function forwardToRouter(token: IntrospectionResult, req: Request, next: NextFunction): Promise<void> {
  let currentUser = await marketplaceUserDao.findByEmail(token.email);
  // User should be authorized at this point. So if we're encountering them for the first time, create a MarketplaceUser record.
  if (!currentUser) {
    try {
      currentUser = await marketplaceUserDao.create({ email: token.email });
    } catch (error: any) {
      // Handle race condition where another request created the user
      if (error.name === 'SequelizeUniqueConstraintError') {
        log.info(`[AUTH] User ${token.email} already exists (race condition), fetching...`);
        currentUser = await marketplaceUserDao.findByEmail(token.email);
        if (!currentUser) {
          throw new Error(`Failed to find user ${token.email} after unique constraint error`);
        }
      } else {
        throw error;
      }
    }
  }
  req.currentUser = currentUser;

  return next();
};
