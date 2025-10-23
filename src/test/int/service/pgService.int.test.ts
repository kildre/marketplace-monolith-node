// src/test/int/db/pgClient.int.test.ts
import 'reflect-metadata';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

describe('pg Client helpers (integration + branch wiring)', () => {
  let container: StartedPostgreSqlContainer;

  //
  // We’ll set env + mocks BEFORE importing the module under test.
  // Then we can import { runPgQuery, runPgQueryWithVars }.
  //
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();

    // Mock your rdbmsConfigService to export values resolved from the container.
    jest.doMock('../../../main/service/config/rdbmsConfigService', () => {
      return {
        rdbmsUser: container.getUsername(),
        rdbmsPassword: container.getPassword(),
        rdbmsHost: container.getHost(),
        rdbmsPort: container.getPort(),
        rdbmsDatabase: container.getDatabase(),
      };
    });

    // Non-SSL for the real connection (Testcontainers postgres not TLS-enabled)
    process.env.PG_SSL_REQUIRE = 'false';

    // Ensure getCert exists (won’t be used in non-SSL, but define anyway)
    jest.doMock('../../../main/service/securityService', () => ({
      getCert: () => 'FAKE_CA_FROM_TEST',
    }));
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  describe('real DB (PG_SSL_REQUIRE=false)', () => {
    let runPgQuery: (q: String) => Promise<any>;
    let runPgQueryWithVars: (q: String, vars: Array<String>) => Promise<any>;

    beforeAll(async () => {
      const mod = await import('../../../main/service/pgService'); // file under test
      runPgQuery = mod.runPgQuery;
      runPgQueryWithVars = mod.runPgQueryWithVars;
    });

    it('runPgQuery can create table and run a simple select', async () => {
      await runPgQuery(`
        CREATE TABLE IF NOT EXISTS t_demo (
          id SERIAL PRIMARY KEY,
          txt TEXT NOT NULL
        )
      `);

      const res = await runPgQuery(`SELECT 1 AS x`);
      expect(res?.rows?.[0]?.x).toBe(1);
    });

    it('runPgQueryWithVars inserts and selects with parameters', async () => {
      const insert = await runPgQueryWithVars(
        `INSERT INTO t_demo (txt) VALUES ($1), ($2) RETURNING id, txt`,
        ['alpha', 'beta']
      );
      expect(insert.rowCount).toBe(2);
      const ids = insert.rows.map((r: any) => r.id);
      expect(ids.length).toBe(2);

      const select = await runPgQueryWithVars(
        `SELECT COUNT(*)::int AS cnt FROM t_demo WHERE txt = $1 OR txt = $2`,
        ['alpha', 'beta']
      );
      expect(select.rows?.[0]?.cnt).toBeGreaterThanOrEqual(2);
    });

    it('runPgQuery delegates to runPgQueryWithVars([]) semantics', async () => {
      const before = await runPgQuery(`SELECT COUNT(*)::int AS cnt FROM t_demo`);
      const baseline = before.rows?.[0]?.cnt ?? 0;
      await runPgQuery(`INSERT INTO t_demo (txt) VALUES ('no_vars')`);
      const after = await runPgQueryWithVars(`SELECT COUNT(*)::int AS cnt FROM t_demo`, []);
      expect(after.rows?.[0]?.cnt).toBe(baseline + 1);
    });
  });

  describe('non-SSL constructor wiring (PG_SSL_REQUIRE="false")', () => {
    beforeAll(() => {
      jest.resetModules();
      process.env.PG_SSL_REQUIRE = 'false';

      // Keep rdbmsConfigService mocked to the container values
      jest.doMock('../../../main/service/config/rdbmsConfigService', () => {
        return {
          rdbmsUser: container.getUsername(),
          rdbmsPassword: container.getPassword(),
          rdbmsHost: container.getHost(),
          rdbmsPort: container.getPort(),
          rdbmsDatabase: container.getDatabase(),
        };
      });

      // Should not be called in non-SSL, but provide anyway
      const getCertMock = jest.fn(() => 'SHOULD_NOT_BE_USED');
      jest.doMock('../../../main/service/securityService', () => ({
        getCert: getCertMock,
      }));
    });

    it('constructs pg.Client without ssl when PG_SSL_REQUIRE is "false"', async () => {
      const clientOptsSeen: any[] = [];
      const queryArgsSeen: any[] = [];

      jest.doMock('pg', () => {
        class FakeClient {
          private opts: any;
          constructor(opts: any) {
            this.opts = opts;
            clientOptsSeen.push(opts);
          }
          connect = jest.fn().mockResolvedValue(undefined);
          query = jest.fn().mockImplementation((q: any, v: any) => {
            queryArgsSeen.push([q, v]);
            return Promise.resolve({ rows: [], rowCount: 0 });
          });
          end = jest.fn().mockResolvedValue(undefined);
        }
        return { Client: FakeClient as any };
      });

      const mod = await import('../../../main/service/pgService');
      const { runPgQueryWithVars } = mod;

      const vars = ['a', 'b'];
      await runPgQueryWithVars('SELECT $1, $2', vars);

      expect(clientOptsSeen.length).toBe(1);
      const seen = clientOptsSeen[0];
      expect(seen).toMatchObject({
        user: container.getUsername(),
        password: container.getPassword(),
        host: container.getHost(),
        port: container.getPort(),
        database: container.getDatabase(),
      });
      // Non-SSL branch: ssl is undefined/absent
      expect('ssl' in seen ? seen.ssl : undefined).toBeUndefined();

      // Ensure runPgQueryWithVars forwards the SAME vars array
      expect(queryArgsSeen[0][0]).toBe('SELECT $1, $2');
      expect(queryArgsSeen[0][1]).toBe(vars); // same reference
    });
  });

  describe('SSL branch wiring (PG_SSL_REQUIRE!=false)', () => {
    beforeAll(() => {
      jest.resetModules();
      process.env.PG_SSL_REQUIRE = 'true';

      const getCertMock = jest.fn((name: string, fp: string) => {
        expect(name).toBe('TLS_CERT_CA');
        expect(fp).toBe('TLS_CERT_CA_FILEPATH');
        return '-----BEGIN CERT-----\nFAKE_CA\n-----END CERT-----';
      });

      jest.doMock('../../../main/service/securityService', () => ({
        getCert: getCertMock,
        __esModule: true,
      }));

      // Keep rdbmsConfigService mocked to the container values
      jest.doMock('../../../main/service/config/rdbmsConfigService', () => {
        return {
          rdbmsUser: container.getUsername(),
          rdbmsPassword: container.getPassword(),
          rdbmsHost: container.getHost(),
          rdbmsPort: container.getPort(),
          rdbmsDatabase: container.getDatabase(),
        };
      });
    });

    it('constructs pg.Client with ssl.ca when PG_SSL_REQUIRE is true, and forwards vars', async () => {
      const clientOptsSeen: any[] = [];
      const queryArgsSeen: any[] = [];

      jest.doMock('pg', () => {
        class FakeClient {
          private opts: any;
          constructor(opts: any) {
            this.opts = opts;
            clientOptsSeen.push(opts);
          }
          connect = jest.fn().mockResolvedValue(undefined);
          query = jest.fn().mockImplementation((q: any, v: any) => {
            queryArgsSeen.push([q, v]);
            return Promise.resolve({ rows: [], rowCount: 0 });
          });
          end = jest.fn().mockResolvedValue(undefined);
        }
        return { Client: FakeClient as any };
      });

      const mod = await import('../../../main/service/pgService');
      const { runPgQueryWithVars } = mod;

      const vars = ['x', 'y'];
      await runPgQueryWithVars('SELECT $1, $2', vars);

      expect(clientOptsSeen.length).toBe(1);
      const seen = clientOptsSeen[0];
      expect(seen).toMatchObject({
        user: container.getUsername(),
        password: container.getPassword(),
        host: container.getHost(),
        port: container.getPort(),
        database: container.getDatabase(),
      });
      expect(seen.ssl).toBeDefined();
      expect(seen.ssl.ca).toContain('FAKE_CA');

      expect(queryArgsSeen[0][0]).toBe('SELECT $1, $2');
      expect(queryArgsSeen[0][1]).toBe(vars);
    });
  });

  describe('Default behavior when PG_SSL_REQUIRE is unset (treated as require SSL)', () => {
    beforeAll(() => {
      jest.resetModules();
      delete process.env.PG_SSL_REQUIRE; // undefined → should be treated as "require SSL"

      const getCertMock = jest.fn(() => '-----BEGIN CERT-----\nFAKE_CA2\n-----END CERT-----');
      jest.doMock('../../../main/service/securityService', () => ({
        getCert: getCertMock,
      }));

      jest.doMock('../../../main/service/config/rdbmsConfigService', () => {
        return {
          rdbmsUser: container.getUsername(),
          rdbmsPassword: container.getPassword(),
          rdbmsHost: container.getHost(),
          rdbmsPort: container.getPort(),
          rdbmsDatabase: container.getDatabase(),
        };
      });
    });

    it('constructs pg.Client with ssl.ca when PG_SSL_REQUIRE is undefined', async () => {
      const clientOptsSeen: any[] = [];

      jest.doMock('pg', () => {
        class FakeClient {
          constructor(opts: any) {
            clientOptsSeen.push(opts);
          }
          connect = jest.fn().mockResolvedValue(undefined);
          query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
          end = jest.fn().mockResolvedValue(undefined);
        }
        return { Client: FakeClient as any };
      });

      const mod = await import('../../../main/service/pgService');
      const { runPgQuery } = mod;

      await runPgQuery('SELECT 1');

      expect(clientOptsSeen.length).toBe(1);
      const seen = clientOptsSeen[0];
      expect(seen.ssl).toBeDefined();
      expect(seen.ssl.ca).toContain('FAKE_CA2');
    });
  });
});
