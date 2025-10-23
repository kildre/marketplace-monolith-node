import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Sequelize } from 'sequelize';

export interface TestDbContext {
  container: StartedPostgreSqlContainer;
  sequelize: Sequelize;
  initDb: () => Promise<void>;
}

export async function setupTestDb(): Promise<TestDbContext> {
  const container = await new PostgreSqlContainer('postgres:16').start();
  const pgUri = container.getConnectionUri();
  process.env.SEQUELIZE_URL = pgUri;
  const entities = await import('../../main/rdbms/entities');
  const sequelize = entities.sequelize as Sequelize;
  const initDb = entities.initDb as () => Promise<void>;
  await initDb();
  await sequelize.authenticate();
  await sequelize.drop();
  await sequelize.sync();
  return { container, sequelize, initDb };
}

export async function teardownTestDb(sequelize: Sequelize, container: StartedPostgreSqlContainer) {
  await sequelize?.close();
  await container?.stop();
}
