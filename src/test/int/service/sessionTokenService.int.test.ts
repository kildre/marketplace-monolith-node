// src/test/int/service/sessionTokenService.int.test.ts
import 'reflect-metadata';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Sequelize } from 'sequelize';
import { SessionToken } from '../../../main/rdbms/entities/SessionToken';
import { SessionTokenService } from '../../../main/service/sessionTokenService';
import { sessionTokenDAO } from '../../../main/rdbms/dao/SessionTokenDAO';

describe('SessionTokenService (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let sequelize: Sequelize;
  let service: SessionTokenService;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16')
      .withUsername('testuser')
      .withPassword('testpass')
      .withDatabase('testdb')
      .start();

    // Create Sequelize instance
    const uri = container.getConnectionUri();
    sequelize = new Sequelize(uri, {
      logging: false,
      dialect: 'postgres',
    });

    // Initialize SessionToken model
    SessionToken.initModel(sequelize);

    // Sync the schema (creates tables)
    await sequelize.sync({ force: true });

    // Create service instance
    service = new SessionTokenService();
  }, 120_000);

  afterAll(async () => {
    await sequelize?.close();
    await container?.stop();
  });

  beforeEach(async () => {
    // Clear all session tokens before each test
    await SessionToken.destroy({ where: {}, truncate: true });
  });

  describe('storeTokenForSession', () => {
    it('creates a new session token with all metadata', async () => {
      const sessionId = 'test-session-001';
      const meta = {
        accessToken: 'access-token-abc123',
        refreshToken: 'refresh-token-xyz789',
        keycloakUserId: 'user-uuid-456',
        username: 'testuser@example.com',
        realmRoles: ['marketplace-requestor', 'marketplace-adjudicator'],
        resourceRoles: { 
          marketplace: { roles: ['admin'] },
          'account': { roles: ['manage-account'] }
        },
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      };

      const result = await service.storeTokenForSession(sessionId, meta);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionId);
      expect(result.accessToken).toBe(meta.accessToken);
      expect(result.refreshToken).toBe(meta.refreshToken);
      expect(result.keycloakUserId).toBe(meta.keycloakUserId);
      expect(result.username).toBe(meta.username);
      expect(result.realmRoles).toEqual(meta.realmRoles);
      expect(result.resourceRoles).toEqual(meta.resourceRoles);
      expect(result.tokenExp).toEqual(meta.tokenExp);
      expect(result.lastUsedAt).toBeDefined();
      expect(result.revokedAt).toBeNull();
    });

    it('updates existing session token when sessionId already exists', async () => {
      const sessionId = 'test-session-002';
      
      // Store initial token
      const initialMeta = {
        accessToken: 'old-token',
        refreshToken: 'old-refresh',
        keycloakUserId: 'old-user-id',
        username: 'olduser',
        realmRoles: ['marketplace-requestor'],
        resourceRoles: {},
        tokenExp: new Date('2025-11-30T23:59:59Z'),
      };
      await service.storeTokenForSession(sessionId, initialMeta);

      // Update with new token
      const newMeta = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        keycloakUserId: 'new-user-id',
        username: 'newuser',
        realmRoles: ['marketplace-adjudicator'],
        resourceRoles: { marketplace: { roles: ['admin'] } },
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      };
      const result = await service.storeTokenForSession(sessionId, newMeta);

      expect(result.sessionId).toBe(sessionId);
      expect(result.accessToken).toBe(newMeta.accessToken);
      expect(result.refreshToken).toBe(newMeta.refreshToken);
      expect(result.keycloakUserId).toBe(newMeta.keycloakUserId);
      expect(result.username).toBe(newMeta.username);
      expect(result.realmRoles).toEqual(newMeta.realmRoles);
      expect(result.revokedAt).toBeNull(); // Reset on update
    });

    it('handles null/undefined optional fields gracefully', async () => {
      const sessionId = 'test-session-003';
      const meta = {
        accessToken: 'minimal-token',
        refreshToken: null,
        keycloakUserId: undefined,
        username: null,
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      };

      const result = await service.storeTokenForSession(sessionId, meta);

      expect(result.sessionId).toBe(sessionId);
      expect(result.accessToken).toBe(meta.accessToken);
      expect(result.refreshToken).toBeNull();
      expect(result.keycloakUserId).toBeNull();
      expect(result.username).toBeNull();
      expect(result.realmRoles).toBeNull();
      expect(result.resourceRoles).toBeNull();
    });

    it('sets lastUsedAt to current time when storing', async () => {
      const sessionId = 'test-session-004';
      const beforeStore = new Date();
      
      const meta = {
        accessToken: 'token-with-timestamp',
        refreshToken: null,
        keycloakUserId: null,
        username: null,
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      };

      const result = await service.storeTokenForSession(sessionId, meta);
      const afterStore = new Date();

      expect(result.lastUsedAt).toBeDefined();
      expect(result.lastUsedAt!.getTime()).toBeGreaterThanOrEqual(beforeStore.getTime());
      expect(result.lastUsedAt!.getTime()).toBeLessThanOrEqual(afterStore.getTime());
    });
  });

  describe('getActiveTokenBySessionId', () => {
    it('returns active token and updates lastUsedAt', async () => {
      const sessionId = 'test-session-005';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'active-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: ['marketplace-requestor'],
        resourceRoles: null,
        tokenExp: futureDate,
      });

      // Get initial lastUsedAt
      const initial = await sessionTokenDAO.findBySessionId(sessionId);
      const initialLastUsed = initial?.lastUsedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const result = await service.getActiveTokenBySessionId(sessionId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.accessToken).toBe('active-token');

      // Verify lastUsedAt was updated
      const updated = await sessionTokenDAO.findBySessionId(sessionId);
      expect(updated?.lastUsedAt?.getTime()).toBeGreaterThan(initialLastUsed!.getTime());
    });

    it('returns null for expired token', async () => {
      const sessionId = 'test-session-006';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'expired-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: pastDate,
      });

      const result = await service.getActiveTokenBySessionId(sessionId);
      expect(result).toBeNull();
    });

    it('returns null for revoked token', async () => {
      const sessionId = 'test-session-007';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'revoked-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      await service.expireSessionBySessionId(sessionId);

      const result = await service.getActiveTokenBySessionId(sessionId);
      expect(result).toBeNull();
    });

    it('returns null for nonexistent session', async () => {
      const result = await service.getActiveTokenBySessionId('nonexistent-session');
      expect(result).toBeNull();
    });

    it('does not update lastUsedAt when session is not found', async () => {
      // This just verifies the method completes without error
      const result = await service.getActiveTokenBySessionId('nonexistent-session');
      expect(result).toBeNull();
    });
  });

  describe('getAnyBySessionId', () => {
    it('returns active session', async () => {
      const sessionId = 'test-session-008';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'active-any-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      const result = await service.getAnyBySessionId(sessionId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.accessToken).toBe('active-any-token');
    });

    it('returns expired session', async () => {
      const sessionId = 'test-session-009';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'expired-any-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: pastDate,
      });

      const result = await service.getAnyBySessionId(sessionId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.accessToken).toBe('expired-any-token');
    });

    it('returns revoked session', async () => {
      const sessionId = 'test-session-010';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'revoked-any-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      await service.expireSessionBySessionId(sessionId);

      const result = await service.getAnyBySessionId(sessionId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.revokedAt).not.toBeNull();
    });

    it('returns null for nonexistent session', async () => {
      const result = await service.getAnyBySessionId('nonexistent-session');
      expect(result).toBeNull();
    });
  });

  describe('getActiveOrAnyBySessionId', () => {
    it('returns active session when available', async () => {
      const sessionId = 'test-session-011';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'active-priority-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      const result = await service.getActiveOrAnyBySessionId(sessionId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.accessToken).toBe('active-priority-token');
    });

    it('falls back to expired session when no active session exists', async () => {
      const sessionId = 'test-session-012';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'fallback-expired-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: pastDate,
      });

      const result = await service.getActiveOrAnyBySessionId(sessionId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.accessToken).toBe('fallback-expired-token');
    });

    it('falls back to revoked session when no active session exists', async () => {
      const sessionId = 'test-session-013';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'fallback-revoked-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      await service.expireSessionBySessionId(sessionId);

      const result = await service.getActiveOrAnyBySessionId(sessionId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.revokedAt).not.toBeNull();
    });

    it('returns null when session does not exist', async () => {
      const result = await service.getActiveOrAnyBySessionId('nonexistent-session');
      expect(result).toBeNull();
    });

    it('updates lastUsedAt when active session is found', async () => {
      const sessionId = 'test-session-014';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'touch-test-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      const initial = await sessionTokenDAO.findBySessionId(sessionId);
      const initialLastUsed = initial?.lastUsedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      await service.getActiveOrAnyBySessionId(sessionId);

      const updated = await sessionTokenDAO.findBySessionId(sessionId);
      expect(updated?.lastUsedAt?.getTime()).toBeGreaterThan(initialLastUsed!.getTime());
    });
  });

  describe('expireSessionBySessionId', () => {
    it('revokes an active session and returns true', async () => {
      const sessionId = 'test-session-015';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'token-to-expire',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      const result = await service.expireSessionBySessionId(sessionId);

      expect(result).toBe(true);

      const session = await sessionTokenDAO.findBySessionId(sessionId);
      expect(session?.revokedAt).not.toBeNull();
    });

    it('returns false when session does not exist', async () => {
      const result = await service.expireSessionBySessionId('nonexistent-session');
      expect(result).toBe(false);
    });

    it('returns false when session is already revoked', async () => {
      const sessionId = 'test-session-016';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'double-expire-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      // First expiration
      await service.expireSessionBySessionId(sessionId);

      // Second expiration attempt
      const result = await service.expireSessionBySessionId(sessionId);
      expect(result).toBe(false);
    });

    it('makes session inactive (not returned by getActiveTokenBySessionId)', async () => {
      const sessionId = 'test-session-017';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'token-inactive-test',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      // Should be active before expiration
      let activeToken = await service.getActiveTokenBySessionId(sessionId);
      expect(activeToken).toBeDefined();

      // Expire the session
      await service.expireSessionBySessionId(sessionId);

      // Should not be active after expiration
      activeToken = await service.getActiveTokenBySessionId(sessionId);
      expect(activeToken).toBeNull();

      // But should still be retrievable via getAnyBySessionId
      const anyToken = await service.getAnyBySessionId(sessionId);
      expect(anyToken).toBeDefined();
    });
  });

  describe('deleteSessionBySessionId', () => {
    it('permanently deletes a session and returns true', async () => {
      const sessionId = 'test-session-018';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'token-to-delete',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      const result = await service.deleteSessionBySessionId(sessionId);

      expect(result).toBe(true);

      const session = await sessionTokenDAO.findBySessionId(sessionId);
      expect(session).toBeNull();
    });

    it('returns false when session does not exist', async () => {
      const result = await service.deleteSessionBySessionId('nonexistent-session');
      expect(result).toBe(false);
    });

    it('deletes revoked sessions', async () => {
      const sessionId = 'test-session-019';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'revoked-then-deleted',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      await service.expireSessionBySessionId(sessionId);

      const result = await service.deleteSessionBySessionId(sessionId);
      expect(result).toBe(true);

      const session = await sessionTokenDAO.findBySessionId(sessionId);
      expect(session).toBeNull();
    });

    it('deletes expired sessions', async () => {
      const sessionId = 'test-session-020';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'expired-then-deleted',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: pastDate,
      });

      const result = await service.deleteSessionBySessionId(sessionId);
      expect(result).toBe(true);

      const session = await sessionTokenDAO.findBySessionId(sessionId);
      expect(session).toBeNull();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('deletes expired sessions and returns count', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      // Create expired sessions
      await service.storeTokenForSession('expired-1', {
        accessToken: 'token-exp-1',
        refreshToken: null,
        keycloakUserId: 'user-1',
        username: 'user1',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: pastDate,
      });

      await service.storeTokenForSession('expired-2', {
        accessToken: 'token-exp-2',
        refreshToken: null,
        keycloakUserId: 'user-2',
        username: 'user2',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: pastDate,
      });

      // Create active session
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      await service.storeTokenForSession('active-1', {
        accessToken: 'token-active-1',
        refreshToken: null,
        keycloakUserId: 'user-3',
        username: 'user3',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      const count = await service.cleanupExpiredSessions();

      expect(count).toBe(2);

      expect(await sessionTokenDAO.findBySessionId('expired-1')).toBeNull();
      expect(await sessionTokenDAO.findBySessionId('expired-2')).toBeNull();
      expect(await sessionTokenDAO.findBySessionId('active-1')).toBeDefined();
    });

    it('deletes revoked sessions and returns count', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Create and revoke sessions
      await service.storeTokenForSession('revoked-1', {
        accessToken: 'token-rev-1',
        refreshToken: null,
        keycloakUserId: 'user-1',
        username: 'user1',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });
      await service.expireSessionBySessionId('revoked-1');

      await service.storeTokenForSession('revoked-2', {
        accessToken: 'token-rev-2',
        refreshToken: null,
        keycloakUserId: 'user-2',
        username: 'user2',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });
      await service.expireSessionBySessionId('revoked-2');

      // Create active session
      await service.storeTokenForSession('active-2', {
        accessToken: 'token-active-2',
        refreshToken: null,
        keycloakUserId: 'user-3',
        username: 'user3',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      const count = await service.cleanupExpiredSessions();

      expect(count).toBe(2);

      expect(await sessionTokenDAO.findBySessionId('revoked-1')).toBeNull();
      expect(await sessionTokenDAO.findBySessionId('revoked-2')).toBeNull();
      expect(await sessionTokenDAO.findBySessionId('active-2')).toBeDefined();
    });

    it('returns 0 when no sessions need cleanup', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await service.storeTokenForSession('active-3', {
        accessToken: 'token-active-3',
        refreshToken: null,
        keycloakUserId: 'user-1',
        username: 'user1',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      const count = await service.cleanupExpiredSessions();
      expect(count).toBe(0);
    });

    it('accepts custom before parameter', async () => {
      const tokenExp = new Date('2025-11-25T12:00:00Z');

      await service.storeTokenForSession('custom-cleanup', {
        accessToken: 'token-custom',
        refreshToken: null,
        keycloakUserId: 'user-1',
        username: 'user1',
        realmRoles: null,
        resourceRoles: null,
        tokenExp,
      });

      // Cleanup before token expiry (should not delete)
      let count = await service.cleanupExpiredSessions(new Date('2025-11-25T11:00:00Z'));
      expect(count).toBe(0);

      // Cleanup after token expiry (should delete)
      count = await service.cleanupExpiredSessions(new Date('2025-11-25T13:00:00Z'));
      expect(count).toBe(1);
    });
  });

  describe('complex integration scenarios', () => {
    it('handles full session lifecycle: store → get active → expire → cleanup', async () => {
      const sessionId = 'lifecycle-test';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Store
      await service.storeTokenForSession(sessionId, {
        accessToken: 'lifecycle-token',
        refreshToken: 'lifecycle-refresh',
        keycloakUserId: 'lifecycle-user',
        username: 'lifecycleuser',
        realmRoles: ['marketplace-requestor'],
        resourceRoles: { marketplace: { roles: ['user'] } },
        tokenExp: futureDate,
      });

      // Get active (should succeed)
      let active = await service.getActiveTokenBySessionId(sessionId);
      expect(active).toBeDefined();

      // Expire
      const expired = await service.expireSessionBySessionId(sessionId);
      expect(expired).toBe(true);

      // Get active (should fail after expiration)
      active = await service.getActiveTokenBySessionId(sessionId);
      expect(active).toBeNull();

      // Get any (should still exist)
      const any = await service.getAnyBySessionId(sessionId);
      expect(any).toBeDefined();

      // Cleanup
      const cleaned = await service.cleanupExpiredSessions();
      expect(cleaned).toBe(1);

      // Should be completely gone
      const gone = await service.getAnyBySessionId(sessionId);
      expect(gone).toBeNull();
    });

    it('handles multiple concurrent sessions independently', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Create multiple sessions
      await service.storeTokenForSession('session-a', {
        accessToken: 'token-a',
        refreshToken: null,
        keycloakUserId: 'user-a',
        username: 'usera',
        realmRoles: ['role-a'],
        resourceRoles: null,
        tokenExp: futureDate,
      });

      await service.storeTokenForSession('session-b', {
        accessToken: 'token-b',
        refreshToken: null,
        keycloakUserId: 'user-b',
        username: 'userb',
        realmRoles: ['role-b'],
        resourceRoles: null,
        tokenExp: futureDate,
      });

      // Expire only session-a
      await service.expireSessionBySessionId('session-a');

      // Verify session-a is inactive
      const activeA = await service.getActiveTokenBySessionId('session-a');
      expect(activeA).toBeNull();

      // Verify session-b is still active
      const activeB = await service.getActiveTokenBySessionId('session-b');
      expect(activeB).toBeDefined();
    });

    it('allows session refresh by storing new token for same sessionId', async () => {
      const sessionId = 'refresh-test';
      const firstExp = new Date();
      firstExp.setDate(firstExp.getDate() + 1);

      // Store first token
      await service.storeTokenForSession(sessionId, {
        accessToken: 'first-token',
        refreshToken: 'first-refresh',
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: ['marketplace-requestor'],
        resourceRoles: null,
        tokenExp: firstExp,
      });

      // Simulate token refresh with new expiry
      const secondExp = new Date();
      secondExp.setDate(secondExp.getDate() + 7);

      await service.storeTokenForSession(sessionId, {
        accessToken: 'second-token',
        refreshToken: 'second-refresh',
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: ['marketplace-requestor', 'marketplace-adjudicator'],
        resourceRoles: { marketplace: { roles: ['admin'] } },
        tokenExp: secondExp,
      });

      const session = await service.getAnyBySessionId(sessionId);
      expect(session?.accessToken).toBe('second-token');
      expect(session?.refreshToken).toBe('second-refresh');
      expect(session?.realmRoles).toEqual(['marketplace-requestor', 'marketplace-adjudicator']);
      expect(session?.tokenExp).toEqual(secondExp);
    });
  });
});
