// src/main/service/sessionTokenService.ts
import { sessionTokenDAO, 
  UpsertSessionPayload,
} from "../rdbms/dao/SessionTokenDAO";
import { SessionToken } from "../rdbms/entities/SessionToken";
import log from "./loggingService";

export interface KeycloakTokenMetadata {
  accessToken: string;
  refreshToken?: string | null;
  keycloakUserId?: string | null; // email or sub
  username?: string | null;
  realmRoles?: string[] | null;
  resourceRoles?: Record<string, any> | null;
  tokenExp: Date; // exp → Date
}

/**
 * Service layer for session<->Keycloak token mapping.
 * Connects controllers with the underlying DAO.
 */
export class SessionTokenService {
  /**
   * Create or update the stored token for a given sessionId.
   * Called by POST /api/session/register.
   */
  async storeTokenForSession(
    sessionId: string,
    meta: KeycloakTokenMetadata
  ): Promise<SessionToken> {
    const payload: UpsertSessionPayload = {
      accessToken: meta.accessToken,
      refreshToken: meta.refreshToken ?? null,
      keycloakUserId: meta.keycloakUserId ?? null,
      username: meta.username ?? null,
      realmRoles: meta.realmRoles ?? null,
      resourceRoles: meta.resourceRoles ?? null,
      tokenExp: meta.tokenExp,
      lastUsedAt: new Date(),
    };

    const entity = await sessionTokenDAO.upsertBySessionId(sessionId, payload);

    log.debug(
      `[SessionTokenService] Stored session token for sessionId=${sessionId}, exp=${meta.tokenExp.toISOString()}`
    );

    return entity;
  }

  /**
   * Get an *active* (non-expired, non-revoked) session token by sessionId.
   * Also updates last_used_at on success.
   */
  async getActiveTokenBySessionId(
    sessionId: string
  ): Promise<SessionToken | null> {
    const now = new Date();
    const entity = await sessionTokenDAO.findActiveBySessionId(sessionId, now);
    if (!entity) {
      log.debug(
        `[SessionTokenService] No active session for sessionId=${sessionId}`
      );
      return null;
    }

    await sessionTokenDAO.touchLastUsed(sessionId, now);
    return entity;
  }

  /**
   * Get session token by sessionId regardless of status (expired/revoked included).
   */
  async getAnyBySessionId(sessionId: string): Promise<SessionToken | null> {
    const entity = await sessionTokenDAO.findBySessionId(sessionId);
    if (!entity) {
      log.debug(
        `[SessionTokenService] No session (any status) for sessionId=${sessionId}`
      );
    }
    return entity;
  }

  /**
   * Convenience method for status endpoints:
   * Try active first; if none, fall back to any existing record.
   */
  async getActiveOrAnyBySessionId(
    sessionId: string
  ): Promise<SessionToken | null> {
    const active = await this.getActiveTokenBySessionId(sessionId);
    if (active) return active;

    return this.getAnyBySessionId(sessionId);
  }

  /**
   * Mark a session as revoked by sessionId.
   * Returns true if at least one row was updated.
   */
  async expireSessionBySessionId(sessionId: string): Promise<boolean> {
    const updated = await sessionTokenDAO.revokeBySessionId(
      sessionId,
      new Date()
    );
    if (updated > 0) {
      log.info(
        `[SessionTokenService] Revoked session for sessionId=${sessionId}`
      );
      return true;
    }

    log.debug(
      `[SessionTokenService] No session found to revoke for sessionId=${sessionId}`
    );
    return false;
  }

  /**
   * Hard-delete a session by sessionId.
   * Returns true if the session was deleted, false if not found.
   */
  async deleteSessionBySessionId(sessionId: string): Promise<boolean> {
    const deleted = await sessionTokenDAO.deleteBySessionId(sessionId);
    if (deleted > 0) {
      log.info(
        `[SessionTokenService] Deleted session for sessionId=${sessionId}`
      );
      return true;
    }

    log.debug(
      `[SessionTokenService] No session found to delete for sessionId=${sessionId}`
    );
    return false;
  }

  /**
   * Optional: hard-delete expired or revoked sessions.
   * Can be invoked by a scheduled job / maintenance task.
   */
  async cleanupExpiredSessions(before: Date = new Date()): Promise<number> {
    const deleted = await sessionTokenDAO.deleteExpired(before);
    if (deleted > 0) {
      log.info(
        `[SessionTokenService] Cleaned up ${deleted} expired/revoked session_tokens`
      );
    }
    return deleted;
  }
}

export const sessionTokenService = new SessionTokenService();
export default sessionTokenService;
