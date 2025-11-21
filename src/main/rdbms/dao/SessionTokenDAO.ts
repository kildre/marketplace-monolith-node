// src/rdbms/dao/SessionTokenDAO.ts
import { Op } from 'sequelize';
import { SessionToken } from '../entities/SessionToken';

export interface UpsertSessionPayload {
  accessToken: string;
  refreshToken?: string | null;
  keycloakUserId?: string | null;        // usually email (FK → marketplace_user.email)
  username?: string | null;
  realmRoles?: string[] | null;
  resourceRoles?: Record<string, any> | null;
  tokenExp: Date;
  lastUsedAt?: Date | null;
}

/**
 * Data Access Object for session_tokens.
 * Supports storing, retrieving, and expiring sessions by sessionId.
 */
export class SessionTokenDAO {
  /**
   * Create or update a session token for the given sessionId.
   * Used by the service when handling RegisterSessionRequestDto.
   */
  async upsertBySessionId(
    sessionId: string,
    payload: UpsertSessionPayload
  ): Promise<SessionToken> {
    const existing = await SessionToken.findOne({ where: { sessionId } });

    if (existing) {
      await existing.update({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken ?? null,
        keycloakUserId: payload.keycloakUserId ?? null,
        username: payload.username ?? null,
        realmRoles: payload.realmRoles ?? null,
        resourceRoles: payload.resourceRoles ?? null,
        tokenExp: payload.tokenExp,
        lastUsedAt: payload.lastUsedAt ?? new Date(),
        revokedAt: null,
      });

      return existing;
    }

    const created = await SessionToken.create({
      sessionId,
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken ?? null,
      keycloakUserId: payload.keycloakUserId ?? null,
      username: payload.username ?? null,
      realmRoles: payload.realmRoles ?? null,
      resourceRoles: payload.resourceRoles ?? null,
      tokenExp: payload.tokenExp,
      lastUsedAt: payload.lastUsedAt ?? new Date(),
      revokedAt: null,
    });

    return created;
  }

  /**
   * Get the raw session token record by sessionId (any status).
   */
  async findBySessionId(sessionId: string): Promise<SessionToken | null> {
    return SessionToken.findOne({ where: { sessionId } });
  }

  /**
   * Get only *active* session by sessionId:
   *  - not revoked
   *  - not expired
   */
  async findActiveBySessionId(
    sessionId: string,
    now: Date = new Date()
  ): Promise<SessionToken | null> {
    return SessionToken.findOne({
      where: {
        sessionId,
        revokedAt: { [Op.is]: null },
        tokenExp: { [Op.gt]: now },
      },
    });
  }

  /**
   * Mark a session as revoked/expired by sessionId.
   * Returns number of rows updated.
   */
  async revokeBySessionId(
    sessionId: string,
    when: Date = new Date()
  ): Promise<number> {
    const [count] = await SessionToken.update(
      { revokedAt: when },
      {
        where: {
          sessionId,
          revokedAt: { [Op.is]: null },
        },
      }
    );
    return count;
  }

  /**
   * Update last_used_at timestamp.
   */
  async touchLastUsed(
    sessionId: string,
    when: Date = new Date()
  ): Promise<number> {
    const [count] = await SessionToken.update(
      { lastUsedAt: when },
      { where: { sessionId } }
    );
    return count;
  }

  /**
   * Delete a specific session by sessionId.
   * Returns the number of rows deleted (0 or 1).
   */
  async deleteBySessionId(sessionId: string): Promise<number> {
    const count = await SessionToken.destroy({
      where: { sessionId },
    });
    return count;
  }

  /**
   * Optional cleanup: delete expired or revoked rows.
   * Useful for a scheduled maintenance job.
   */
  async deleteExpired(before: Date = new Date()): Promise<number> {
    const count = await SessionToken.destroy({
      where: {
        [Op.or]: [
          { tokenExp: { [Op.lt]: before } },
          { revokedAt: { [Op.not]: null } },
        ],
      },
    });
    return count;
  }
}

const sessionTokenDAO = new SessionTokenDAO();
export default sessionTokenDAO;
export { sessionTokenDAO };
