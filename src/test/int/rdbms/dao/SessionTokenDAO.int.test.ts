// src/test/int/rdbms/dao/SessionTokenDAO.int.test.ts
import 'reflect-metadata';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Sequelize } from 'sequelize';
import { SessionToken } from '../../../../main/rdbms/entities/SessionToken';
import { SessionTokenDAO } from '../../../../main/rdbms/dao/SessionTokenDAO';

describe('SessionTokenDAO (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let sequelize: Sequelize;
  let dao: SessionTokenDAO;

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

    // Create DAO instance
    dao = new SessionTokenDAO();
  }, 120_000);

  afterAll(async () => {
    await sequelize?.close();
    await container?.stop();
  });

  beforeEach(async () => {
    // Clear all session tokens before each test
    await SessionToken.destroy({ where: {}, truncate: true });
  });

  describe('upsertBySessionId', () => {
    it('creates a new session token when sessionId does not exist', async () => {
      const sessionId = 'test-session-001';
      const payload = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        keycloakUserId: 'user-uuid-789',
        username: 'testuser',
        realmRoles: ['marketplace-requestor'],
        resourceRoles: { marketplace: { roles: ['user'] } },
        tokenExp: new Date('2025-12-31T23:59:59Z'),
        lastUsedAt: new Date('2025-11-20T10:00:00Z'),
      };

      const result = await dao.upsertBySessionId(sessionId, payload);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionId);
      expect(result.accessToken).toBe(payload.accessToken);
      expect(result.refreshToken).toBe(payload.refreshToken);
      expect(result.keycloakUserId).toBe(payload.keycloakUserId);
      expect(result.username).toBe(payload.username);
      expect(result.realmRoles).toEqual(payload.realmRoles);
      expect(result.resourceRoles).toEqual(payload.resourceRoles);
      expect(result.revokedAt).toBeNull();
    });

    it('updates an existing session token when sessionId already exists', async () => {
      const sessionId = 'test-session-002';
      const initialPayload = {
        accessToken: 'old-access-token',
        refreshToken: 'old-refresh-token',
        keycloakUserId: 'user-uuid-123',
        username: 'olduser',
        realmRoles: ['marketplace-requestor'],
        resourceRoles: {},
        tokenExp: new Date('2025-11-25T23:59:59Z'),
      };

      // Create initial session
      await dao.upsertBySessionId(sessionId, initialPayload);

      // Update with new payload
      const updatedPayload = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        keycloakUserId: 'user-uuid-456',
        username: 'newuser',
        realmRoles: ['marketplace-adjudicator'],
        resourceRoles: { marketplace: { roles: ['admin'] } },
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      };

      const result = await dao.upsertBySessionId(sessionId, updatedPayload);

      expect(result.sessionId).toBe(sessionId);
      expect(result.accessToken).toBe(updatedPayload.accessToken);
      expect(result.refreshToken).toBe(updatedPayload.refreshToken);
      expect(result.keycloakUserId).toBe(updatedPayload.keycloakUserId);
      expect(result.username).toBe(updatedPayload.username);
      expect(result.realmRoles).toEqual(updatedPayload.realmRoles);
      expect(result.revokedAt).toBeNull(); // Reset on update
    });

    it('resets revokedAt to null when updating a previously revoked session', async () => {
      const sessionId = 'test-session-003';
      const payload = {
        accessToken: 'access-token-abc',
        refreshToken: null,
        keycloakUserId: 'user-xyz',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      };

      // Create and revoke
      await dao.upsertBySessionId(sessionId, payload);
      await dao.revokeBySessionId(sessionId);

      // Verify it's revoked
      let session = await dao.findBySessionId(sessionId);
      expect(session?.revokedAt).not.toBeNull();

      // Update should reset revokedAt
      await dao.upsertBySessionId(sessionId, {
        ...payload,
        accessToken: 'new-token',
      });

      session = await dao.findBySessionId(sessionId);
      expect(session?.revokedAt).toBeNull();
    });
  });

  describe('findBySessionId', () => {
    it('returns the session token when it exists', async () => {
      const sessionId = 'test-session-004';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-123',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      const result = await dao.findBySessionId(sessionId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.accessToken).toBe('token-123');
    });

    it('returns null when sessionId does not exist', async () => {
      const result = await dao.findBySessionId('nonexistent-session');
      expect(result).toBeNull();
    });

    it('returns expired sessions', async () => {
      const sessionId = 'test-session-005';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-expired',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2020-01-01T00:00:00Z'), // Expired
      });

      const result = await dao.findBySessionId(sessionId);
      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
    });

    it('returns revoked sessions', async () => {
      const sessionId = 'test-session-006';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-revoked',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });
      await dao.revokeBySessionId(sessionId);

      const result = await dao.findBySessionId(sessionId);
      expect(result).toBeDefined();
      expect(result?.revokedAt).not.toBeNull();
    });
  });

  describe('findActiveBySessionId', () => {
    it('returns active session (not expired, not revoked)', async () => {
      const sessionId = 'test-session-007';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

      await dao.upsertBySessionId(sessionId, {
        accessToken: 'active-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });

      const result = await dao.findActiveBySessionId(sessionId);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.accessToken).toBe('active-token');
    });

    it('returns null for expired session', async () => {
      const sessionId = 'test-session-008';
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

      await dao.upsertBySessionId(sessionId, {
        accessToken: 'expired-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: pastDate,
      });

      const result = await dao.findActiveBySessionId(sessionId);
      expect(result).toBeNull();
    });

    it('returns null for revoked session', async () => {
      const sessionId = 'test-session-009';
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await dao.upsertBySessionId(sessionId, {
        accessToken: 'revoked-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: futureDate,
      });
      await dao.revokeBySessionId(sessionId);

      const result = await dao.findActiveBySessionId(sessionId);
      expect(result).toBeNull();
    });

    it('accepts custom now parameter for time-based testing', async () => {
      const sessionId = 'test-session-010';
      const tokenExp = new Date('2025-11-25T12:00:00Z');

      await dao.upsertBySessionId(sessionId, {
        accessToken: 'time-test-token',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp,
      });

      // Check before expiry
      const beforeExp = new Date('2025-11-25T11:00:00Z');
      let result = await dao.findActiveBySessionId(sessionId, beforeExp);
      expect(result).toBeDefined();

      // Check after expiry
      const afterExp = new Date('2025-11-25T13:00:00Z');
      result = await dao.findActiveBySessionId(sessionId, afterExp);
      expect(result).toBeNull();
    });
  });

  describe('revokeBySessionId', () => {
    it('revokes an active session and returns 1', async () => {
      const sessionId = 'test-session-011';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-to-revoke',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      const revokeTime = new Date('2025-11-20T14:30:00Z');
      const count = await dao.revokeBySessionId(sessionId, revokeTime);

      expect(count).toBe(1);

      const session = await dao.findBySessionId(sessionId);
      expect(session?.revokedAt).toEqual(revokeTime);
    });

    it('returns 0 when sessionId does not exist', async () => {
      const count = await dao.revokeBySessionId('nonexistent-session');
      expect(count).toBe(0);
    });

    it('returns 0 when session is already revoked', async () => {
      const sessionId = 'test-session-012';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-double-revoke',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      // First revoke
      await dao.revokeBySessionId(sessionId);

      // Second revoke attempt
      const count = await dao.revokeBySessionId(sessionId);
      expect(count).toBe(0);
    });

    it('uses current time when when parameter is not provided', async () => {
      const sessionId = 'test-session-013';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-default-time',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      const beforeRevoke = new Date();
      await dao.revokeBySessionId(sessionId);
      const afterRevoke = new Date();

      const session = await dao.findBySessionId(sessionId);
      expect(session?.revokedAt).toBeDefined();
      expect(session!.revokedAt!.getTime()).toBeGreaterThanOrEqual(beforeRevoke.getTime());
      expect(session!.revokedAt!.getTime()).toBeLessThanOrEqual(afterRevoke.getTime());
    });
  });

  describe('touchLastUsed', () => {
    it('updates lastUsedAt timestamp and returns 1', async () => {
      const sessionId = 'test-session-014';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-touch',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
        lastUsedAt: new Date('2025-11-20T10:00:00Z'),
      });

      const newTime = new Date('2025-11-20T15:00:00Z');
      const count = await dao.touchLastUsed(sessionId, newTime);

      expect(count).toBe(1);

      const session = await dao.findBySessionId(sessionId);
      expect(session?.lastUsedAt).toEqual(newTime);
    });

    it('returns 0 when sessionId does not exist', async () => {
      const count = await dao.touchLastUsed('nonexistent-session');
      expect(count).toBe(0);
    });

    it('uses current time when when parameter is not provided', async () => {
      const sessionId = 'test-session-015';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-touch-default',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
        lastUsedAt: new Date('2025-11-20T10:00:00Z'),
      });

      const beforeTouch = new Date();
      await dao.touchLastUsed(sessionId);
      const afterTouch = new Date();

      const session = await dao.findBySessionId(sessionId);
      expect(session?.lastUsedAt).toBeDefined();
      expect(session!.lastUsedAt!.getTime()).toBeGreaterThanOrEqual(beforeTouch.getTime());
      expect(session!.lastUsedAt!.getTime()).toBeLessThanOrEqual(afterTouch.getTime());
    });
  });

  describe('deleteBySessionId', () => {
    it('deletes the session and returns 1', async () => {
      const sessionId = 'test-session-016';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-to-delete',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      const count = await dao.deleteBySessionId(sessionId);
      expect(count).toBe(1);

      const session = await dao.findBySessionId(sessionId);
      expect(session).toBeNull();
    });

    it('returns 0 when sessionId does not exist', async () => {
      const count = await dao.deleteBySessionId('nonexistent-session');
      expect(count).toBe(0);
    });

    it('deletes revoked sessions', async () => {
      const sessionId = 'test-session-017';
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'token-revoked-then-deleted',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });
      await dao.revokeBySessionId(sessionId);

      const count = await dao.deleteBySessionId(sessionId);
      expect(count).toBe(1);

      const session = await dao.findBySessionId(sessionId);
      expect(session).toBeNull();
    });
  });

  describe('deleteExpired', () => {
    it('deletes expired sessions based on tokenExp', async () => {
      // Create expired session
      await dao.upsertBySessionId('expired-1', {
        accessToken: 'token-exp-1',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2020-01-01T00:00:00Z'),
      });

      // Create active session
      await dao.upsertBySessionId('active-1', {
        accessToken: 'token-active-1',
        refreshToken: null,
        keycloakUserId: 'user-456',
        username: 'activeuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      const count = await dao.deleteExpired();
      expect(count).toBe(1);

      const expired = await dao.findBySessionId('expired-1');
      expect(expired).toBeNull();

      const active = await dao.findBySessionId('active-1');
      expect(active).toBeDefined();
    });

    it('deletes revoked sessions', async () => {
      // Create revoked session
      await dao.upsertBySessionId('revoked-1', {
        accessToken: 'token-revoked-1',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });
      await dao.revokeBySessionId('revoked-1');

      // Create active session
      await dao.upsertBySessionId('active-2', {
        accessToken: 'token-active-2',
        refreshToken: null,
        keycloakUserId: 'user-456',
        username: 'activeuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      const count = await dao.deleteExpired();
      expect(count).toBe(1);

      const revoked = await dao.findBySessionId('revoked-1');
      expect(revoked).toBeNull();

      const active = await dao.findBySessionId('active-2');
      expect(active).toBeDefined();
    });

    it('deletes both expired and revoked sessions', async () => {
      // Expired
      await dao.upsertBySessionId('expired-2', {
        accessToken: 'token-exp-2',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2020-01-01T00:00:00Z'),
      });

      // Revoked
      await dao.upsertBySessionId('revoked-2', {
        accessToken: 'token-revoked-2',
        refreshToken: null,
        keycloakUserId: 'user-456',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });
      await dao.revokeBySessionId('revoked-2');

      // Active
      await dao.upsertBySessionId('active-3', {
        accessToken: 'token-active-3',
        refreshToken: null,
        keycloakUserId: 'user-789',
        username: 'activeuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      const count = await dao.deleteExpired();
      expect(count).toBe(2);

      expect(await dao.findBySessionId('expired-2')).toBeNull();
      expect(await dao.findBySessionId('revoked-2')).toBeNull();
      expect(await dao.findBySessionId('active-3')).toBeDefined();
    });

    it('returns 0 when no sessions qualify for deletion', async () => {
      await dao.upsertBySessionId('active-4', {
        accessToken: 'token-active-4',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      const count = await dao.deleteExpired();
      expect(count).toBe(0);
    });

    it('accepts custom before parameter', async () => {
      await dao.upsertBySessionId('expire-custom', {
        accessToken: 'token-custom',
        refreshToken: null,
        keycloakUserId: 'user-123',
        username: 'testuser',
        realmRoles: null,
        resourceRoles: null,
        tokenExp: new Date('2025-11-25T12:00:00Z'),
      });

      // Delete before the token expiry (should not delete)
      let count = await dao.deleteExpired(new Date('2025-11-25T11:00:00Z'));
      expect(count).toBe(0);

      // Delete after the token expiry (should delete)
      count = await dao.deleteExpired(new Date('2025-11-25T13:00:00Z'));
      expect(count).toBe(1);
    });
  });

  describe('complex scenarios', () => {
    it('handles multiple concurrent sessions for different sessionIds', async () => {
      await dao.upsertBySessionId('session-a', {
        accessToken: 'token-a',
        refreshToken: null,
        keycloakUserId: 'user-a',
        username: 'usera',
        realmRoles: ['role-a'],
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      await dao.upsertBySessionId('session-b', {
        accessToken: 'token-b',
        refreshToken: null,
        keycloakUserId: 'user-b',
        username: 'userb',
        realmRoles: ['role-b'],
        resourceRoles: null,
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      const sessionA = await dao.findBySessionId('session-a');
      const sessionB = await dao.findBySessionId('session-b');

      expect(sessionA?.keycloakUserId).toBe('user-a');
      expect(sessionB?.keycloakUserId).toBe('user-b');
    });

    it('maintains data integrity through full lifecycle: create → touch → revoke → delete', async () => {
      const sessionId = 'lifecycle-test';

      // Create
      await dao.upsertBySessionId(sessionId, {
        accessToken: 'lifecycle-token',
        refreshToken: 'lifecycle-refresh',
        keycloakUserId: 'lifecycle-user',
        username: 'lifecycleuser',
        realmRoles: ['marketplace-requestor'],
        resourceRoles: { marketplace: { roles: ['user'] } },
        tokenExp: new Date('2025-12-31T23:59:59Z'),
      });

      let session = await dao.findBySessionId(sessionId);
      expect(session).toBeDefined();
      expect(session?.accessToken).toBe('lifecycle-token');

      // Touch
      const touchTime = new Date('2025-11-20T14:00:00Z');
      await dao.touchLastUsed(sessionId, touchTime);
      session = await dao.findBySessionId(sessionId);
      expect(session?.lastUsedAt).toEqual(touchTime);

      // Revoke
      const revokeTime = new Date('2025-11-20T15:00:00Z');
      await dao.revokeBySessionId(sessionId, revokeTime);
      session = await dao.findBySessionId(sessionId);
      expect(session?.revokedAt).toEqual(revokeTime);

      // Delete
      await dao.deleteBySessionId(sessionId);
      session = await dao.findBySessionId(sessionId);
      expect(session).toBeNull();
    });
  });
});
