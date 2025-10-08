// test/_setup/setup-db.ts
import { Sequelize } from 'sequelize';

try { require('ts-node/register/transpile-only'); } catch {}
import { Umzug, SequelizeStorage } from 'umzug';


if (!process.env.DOCKER_AUTH_CONFIG) {
  // empty auths => no helper calls
  process.env.DOCKER_AUTH_CONFIG = JSON.stringify({ auths: {} });
}

const HOOK_TIMEOUT = Number(process.env.JEST_INTEGRATION_TIMEOUT_MS ?? 120_000);
jest.setTimeout(HOOK_TIMEOUT); // affects tests & hooks in this process

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

// We'll import your entities *after* env is set
let container: StartedPostgreSqlContainer | null = null;
let sequelize: Sequelize | null = null;

// If you want to access sequelize in tests: (global as any).__SEQUELIZE__
declare global {
  // eslint-disable-next-line no-var
  var __SEQUELIZE__: Sequelize | undefined;
}

import path from 'path';
import * as SequelizeLib from 'sequelize'; // for the second arg

// We'll create the Umzug instance after sequelize is initialized, inside beforeAll
// Remove the early Umzug creation and migration run here.

beforeAll(async () => {
  // 1) Boot a disposable Postgres
  container = await new PostgreSqlContainer('postgres:16')
    .withDatabase('testdb')
    .withUsername('test')
    .withPassword('test')
    .start();

  // 2) Set env BEFORE importing your entities/index.ts
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.NODE_ENV = 'test';

  // 3) Import your entities (this file initializes models & associations)
  const entities = await import('../main/rdbms/entities'); // adjust path if needed
  // entities exports: { sequelize, initDb, ...models }

  // 4) Authenticate (your helper)
  await entities.initDb();
  sequelize = entities.sequelize as Sequelize;

  // 5) Run migrations (skip if you use sync instead)
  const umzug = new Umzug({
    migrations: {
      // glob your TS/JS migrations
      glob: path.join(process.cwd(), 'src/main/rdbms/migrations/**/*.{ts,js}'),

      // map loaded modules to the Sequelize-CLI signature
      resolve: ({ name, path, context }) => {
        if (!path) {
          throw new Error(`Migration path for ${name} is undefined`);
        }
        const mod = require(path);
        const migration = mod.default ?? mod; // handle ESM/CJS

        // Support both exports: { up, down } or export default { up, down }
        if (!migration?.up || !migration?.down) {
          throw new Error(`Migration ${name} does not export { up, down }`);
        }
        return {
          name,
          up: async () => migration.up(context, SequelizeLib),
          down: async () => migration.down(context, SequelizeLib),
        };
      },
    },
    // pass the QueryInterface as context
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: undefined,
  });
  await umzug.up();

  (global as any).__SEQUELIZE__ = sequelize;
});

afterAll(async () => {
  try {
    if (sequelize) await sequelize.close();
  } finally {
    if (container) await container.stop();
  }
});

beforeEach(async () => {
  // Clean tables between tests
  if (!sequelize) return;
  const qi: any = sequelize.getQueryInterface();
  let tables: any[] = await qi.showAllTables();
  const names = tables.map((t: any) =>
    typeof t === 'string' ? t : t.tableName || t.table_name
  );
  if (names.length) {
    const quoted = names.map((t) => `"${t}"`).join(', ');
    await sequelize.query(`TRUNCATE ${quoted} RESTART IDENTITY CASCADE;`);
  }
});
