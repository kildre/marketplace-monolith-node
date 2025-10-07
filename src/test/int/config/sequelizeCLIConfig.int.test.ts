// src/test/int/config/sequelizeCLIConfig.int.test.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import path from 'path';

const MODULE_PATH = path.resolve(__dirname, '../../..', 'main/config/sequelizeCLIConfig.cjs');

describe('sequelizeCLIConfig.cjs (integration with Postgres container)', () => {
  let container: StartedPostgreSqlContainer;
  let pgUri: string;
  const originalEnv = process.env;

  const reload = () => {
    delete require.cache[require.resolve(MODULE_PATH)];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(MODULE_PATH);
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();
    pgUri = container.getConnectionUri();
  }, 120_000);

  afterAll(async () => {
    if (container) await container.stop();
  });

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.log as jest.Mock).mockRestore?.();
    process.env = originalEnv;
  });

  it('development + URL + DB_SSL=false → use_env_variable present, authenticate ok', async () => {
    // Force all known URL env vars to the container URI to avoid host env leakage
    process.env.NODE_ENV = 'development';
    process.env.DB_SSL = '0';
    process.env['secret-env-postgresql'] = pgUri;
    process.env['SECRET_ENV_POSTGRESQL'] = pgUri;
    process.env.SEQUELIZE_URL = pgUri;
    delete process.env.SEQUELIZE_LOG_SQL;

    const cfg = reload();

    // All envs should expose use_env_variable when a URL is present
    expect(cfg.development.use_env_variable).toBe('SEQUELIZE_URL');
    expect(cfg.test.use_env_variable).toBe('SEQUELIZE_URL');
    expect(cfg.production.use_env_variable).toBe('SEQUELIZE_URL');

    // dev logging false (SEQUELIZE_LOG_SQL not truthy)
    expect(cfg.development.logging).toBe(false);
    // no SSL when DB_SSL=false
    expect(cfg.development.dialect).toBe('postgres');
    expect(cfg.development.dialectOptions).toBeUndefined();

    // Default export sequelize created with NODE_ENV=development
    await expect(cfg.sequelize.authenticate()).resolves.not.toThrow();

    // Explicit factory also connects
    const s2 = cfg.createSequelize('development');
    await expect(s2.authenticate()).resolves.not.toThrow();
    await s2.close();
  }, 120_000);

  it('test + URL + DB_SSL=false → test logging forced false, authenticate ok', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DB_SSL = '0';
    // Force URLs to container (override any host env)
    process.env['secret-env-postgresql'] = pgUri;
    process.env['SECRET_ENV_POSTGRESQL'] = pgUri;
    process.env.SEQUELIZE_URL = pgUri;
    delete process.env.SEQUELIZE_LOG_SQL;

    const cfg = reload();

    // test env forces logging=false
    expect(cfg.test.logging).toBe(false);

    // default sequelize built with NODE_ENV='test'
    await expect(cfg.sequelize.authenticate()).resolves.not.toThrow();

    // explicit 'test' factory
    const s2 = cfg.createSequelize('test');
    await expect(s2.authenticate()).resolves.not.toThrow();
    await s2.close();
  }, 120_000);

  it('development + DB_SSL=true → dialectOptions contains ssl subset (skip authenticate)', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DB_SSL = 'true'; // enable SSL branch
    // Ensure URL is the container’s (avoid host env)
    process.env['secret-env-postgresql'] = pgUri;
    process.env['SECRET_ENV_POSTGRESQL'] = pgUri;
    process.env.SEQUELIZE_URL = pgUri;

    const cfg = reload();

    expect(cfg.development.dialect).toBe('postgres');
    // Some Sequelize/pg versions inject additional connection fields into dialectOptions.
    // Assert on the ssl subset only.
    expect(cfg.development.dialectOptions).toMatchObject({
      ssl: { require: true, rejectUnauthorized: false },
    });

    // Do NOT authenticate with SSL here; the container is not SSL-enabled.
  });
});
