// src/test/int/service/dbHealth.int.test.ts
import 'reflect-metadata';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Sequelize } from 'sequelize';

describe('assertDatabaseConnectionOk / closeDatabase (integration)', () => {
  let container: StartedPostgreSqlContainer;

  const modPath = '../../../main/service/sequelize'; 
  const cfgPath = '../../../main/config/sequelizeCLIConfig.cjs'; 

  const origLog = console.log;
  const origErr = console.error;
  let logSpy: jest.SpyInstance;
  let errSpy: jest.SpyInstance;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16')
      .withUsername('testuser')
      .withPassword('testpass')
      .withDatabase('testdb')
      .start();
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  beforeEach(() => {
    jest.resetModules();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  describe('success path', () => {
    it('authenticates, runs a query, and logs ✅; closeDatabase closes the connection', async () => {
      const uri = container.getConnectionUri();

      // Mock the app's sequelize singleton to point at the running container
      jest.doMock(cfgPath, () => {
        const sequelize = new Sequelize(uri, { logging: false });
        return { sequelize };
      });

      const mod = await import(modPath);
      const { assertDatabaseConnectionOk, closeDatabase } = mod as {
        assertDatabaseConnectionOk: () => Promise<void>;
        closeDatabase: () => Promise<void>;
      };

      await expect(assertDatabaseConnectionOk()).resolves.toBeUndefined();

      // Confirm the success log was printed
      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/DB connection OK/));

      // Call close and ensure it does not throw
      await expect(closeDatabase()).resolves.toBeUndefined();
    });
  });

  describe('failure path', () => {
    it('logs structured error (with original.code when present) and rethrows', async () => {
      const host = container.getHost();
      const port = container.getPort();
      const db = container.getDatabase();
      const user = container.getUsername();
      const badPass = 'WRONG_PASSWORD';

      // Build a sequelize pointing to the same DB but with a wrong password → auth failure (28P01)
      const badUri = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(badPass)}@${host}:${port}/${db}`;

      jest.doMock(cfgPath, () => {
        const sequelize = new Sequelize(badUri, { logging: false });
        return { sequelize };
      });

      const mod = await import(modPath);
      const { assertDatabaseConnectionOk, closeDatabase } = mod as {
        assertDatabaseConnectionOk: () => Promise<void>;
        closeDatabase: () => Promise<void>;
      };

      await expect(assertDatabaseConnectionOk()).rejects.toBeInstanceOf(Error);

      // Check error logging shape (do not over-specify driver message)
      expect(errSpy).toHaveBeenCalledTimes(1);
      const call = errSpy.mock.calls[0];
      expect(String(call[0])).toMatch(/Unable to connect/i);
      // The second argument should be the structured object we log
      const payload = call[1];
      expect(payload).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          message: expect.any(String),
          // pg will typically expose '28P01' for bad password; use loose matcher
          code: expect.anything(),
        })
      );

      // Ensure we can still close the singleton (even after failed auth attempt)
      await expect(closeDatabase()).resolves.toBeUndefined();
    });
  });

  describe('non-Error thrown branch', () => {
    it('logs stringified non-Error and rethrows', async () => {
      const uri = container.getConnectionUri();

      // Mock config to a working sequelize, then monkey-patch authenticate to throw a non-Error
      jest.doMock(cfgPath, () => {
        const sequelize = new Sequelize(uri, { logging: false }) as any;
        sequelize.authenticate = jest.fn().mockRejectedValue('non-error-thing');
        sequelize.query = jest.fn().mockResolvedValue(undefined);
        return { sequelize };
      });

      const mod = await import(modPath);
      const { assertDatabaseConnectionOk, closeDatabase } = mod as {
        assertDatabaseConnectionOk: () => Promise<void>;
        closeDatabase: () => Promise<void>;
      };

      await expect(assertDatabaseConnectionOk()).rejects.toEqual('non-error-thing');

      expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/Unable to connect/i), 'non-error-thing');

      await expect(closeDatabase()).resolves.toBeUndefined();
    });
  });
});
