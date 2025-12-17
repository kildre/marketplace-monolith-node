// src/test/int/service/userEndpointService.int.test.ts
import 'reflect-metadata';
import type { Request } from 'express';
import { Sequelize } from 'sequelize';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

// SUT path (used after we set up mocks)
const svcPath = '../../../main/service/userEndpointService';

// A tiny helper (consistent with your previous utils)
const normalizeEmail = (e: string) => e.trim().toLowerCase();

// Helper to build a minimal Express-like Request with Authorization header
function makeReq(token: string | undefined): Request {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as Request;
}

describe('userEndpointService (integration, token-based roles)', () => {
  let container: StartedPostgreSqlContainer;
  let sequelize: Sequelize;
  let initDb: () => Promise<void>;
  let MarketplaceUser: any;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();
    const pgUri = container.getConnectionUri();

    process.env.DB_DIALECT = 'postgres';
    process.env.DB_SSL = '0';
    process.env.SEQUELIZE_URL = pgUri;
    delete process.env['secret-env-postgresql'];
    delete process.env['SECRET_ENV_POSTGRESQL'];

    const entities = await import('../../../main/rdbms/entities');
    sequelize = entities.sequelize as Sequelize;
    initDb = entities.initDb as () => Promise<void>;

    await initDb();
    await sequelize.authenticate();
    await sequelize.drop();
    await sequelize.sync();

    MarketplaceUser = sequelize.models.MarketplaceUser;
  }, 120_000);

  afterAll(async () => {
    await sequelize?.close();
    await container?.stop();
  });

  beforeEach(async () => {
    // Clean only users; there are no roles/user_roles anymore
    await MarketplaceUser.destroy({ where: {} });
    jest.clearAllMocks();
  });

  //
  // MOCK the token helpers used by the service (../config/authConfig)
  // We map tokens → roles:
  //
  function mockAuthConfig() {
    jest.doMock('../../../main/config/authConfig', () => {
      return {
        getAuthToken: (req: Request) => {
          const h = req.headers?.authorization || '';
          const m = typeof h === 'string' ? h.match(/^Bearer\s+(.+)$/i) : null;
          return m ? m[1] : undefined;
        },
      };
    });
  }

  // -------------------- DB-backed lookups --------------------

  it('findByEmail → throws when userEmail is missing/blank', async () => {
    mockAuthConfig();
    const mod = await import(svcPath);
    const userEndpointService = mod.default;

    await expect(
      userEndpointService.findByEmail({ userEmail: '   ' })
    ).rejects.toThrow(/userEmail is required/i);
  });

  it('findByEmail → returns user when found (normalizes input)', async () => {
    // insert a user
    const testEmail = 'user@example.com';
    const created = await MarketplaceUser.create({ email: normalizeEmail(testEmail) });

    mockAuthConfig();
    const mod = await import(svcPath);
    const userEndpointService = mod.default;

    const res = await userEndpointService.findByEmail({
      userEmail: '  USER@EXAMPLE.com ',
    });

    expect(res).toBeDefined();
    expect(res.id).toBe(created.id);
    expect(res.email).toBe(normalizeEmail(testEmail));
  });

  it('findByEmail → throws when user not found', async () => {
    mockAuthConfig();
    const mod = await import(svcPath);
    const userEndpointService = mod.default;

    await expect(
      userEndpointService.findByEmail({ userEmail: 'missing@example.com' })
    ).rejects.toThrow(/User with email missing@example\.com not found/i);
  });

  it('findIdByEmail → throws when userEmail is missing/blank', async () => {
    mockAuthConfig();
    const mod = await import(svcPath);
    const userEndpointService = mod.default as any;

    await expect(
      userEndpointService.findIdByEmail({ userEmail: '   ' })
    ).rejects.toThrow(/userEmail is required\./i);
  });

  it('findIdByEmail → returns id when found (normalizes input)', async () => {
    const testEmail = 'user2@example.com';
    const created = await MarketplaceUser.create({ email: normalizeEmail(testEmail) });

    mockAuthConfig();
    const mod = await import(svcPath);
    const userEndpointService = mod.default as any;

    const res = await userEndpointService.findIdByEmail({
      userEmail: '  USER2@EXAMPLE.com ',
    });

    expect(typeof res).toBe('number');
    expect(res).toBe(created.id);
  });

  it('findIdByEmail → throws when user not found', async () => {
    mockAuthConfig();
    const mod = await import(svcPath);
    const userEndpointService = mod.default as any;

    await expect(
      userEndpointService.findIdByEmail({ userEmail: 'missing2@example.com' })
    ).rejects.toThrow(/User with email missing2@example\.com not found\./i);
  });
});
