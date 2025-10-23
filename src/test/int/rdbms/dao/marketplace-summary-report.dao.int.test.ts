// src/test/int/rdbms/dao/marketplace-summary-report.dao.int.test.ts
import { Transaction } from 'sequelize';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

import { MarketplaceSummaryReportDAO } from '../../../../main/rdbms/dao/MarketplaceSummaryReportDAO';

// Entities your DAO queries over:
import { MarketplaceUser } from '../../../../main/rdbms/entities/MarketplaceUser';
import { UseCaseRequest } from '../../../../main/rdbms/entities/UseCaseRequest';
import { MarketplaceOrder } from '../../../../main/rdbms/entities/MarketplaceOrder';
import { Status } from '../../../../main/rdbms/entities/Status';
import { Decision } from '../../../../main/rdbms/entities/Decision';
import { OrderItem } from '../../../../main/rdbms/entities/OrderItem';

describe('MarketplaceSummaryReportDAO (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let pgUri: string;

  // Pull the config's sequelize only AFTER env is set
  let config: any;
  let sequelize: import('sequelize').Sequelize;

  const MODULE_PATH = '../../../../main/config/sequelizeCLIConfig.cjs';

  const reloadConfigSequelize = () => {
    delete require.cache[require.resolve(MODULE_PATH)];
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    config = require(MODULE_PATH);
    sequelize = config.sequelize;
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();
    pgUri = container.getConnectionUri();

    // Make sure the config module connects to the Testcontainers DB
    process.env.DB_DIALECT = 'postgres';
    process.env.DB_SSL = '0';
    process.env.SEQUELIZE_URL = pgUri;
    // clear the two “secret” envs so they don’t override SEQUELIZE_URL from your shell
    delete process.env['secret-env-postgresql'];
    delete process.env['SECRET_ENV_POSTGRESQL'];

    reloadConfigSequelize();

    // --- Initialize ALL models on THIS (config) sequelize ---
    MarketplaceUser.initModel(sequelize);
    Status.initModel(sequelize);
    UseCaseRequest.initModel(sequelize);
    MarketplaceOrder.initModel(sequelize);
    Decision.initModel(sequelize);
    OrderItem.initModel(sequelize);

    // --- Wire associations AFTER all models are initialized ---
    if (typeof MarketplaceOrder.associate === 'function') {
      MarketplaceOrder.associate(sequelize);
    }
    if (typeof Decision.associate === 'function') {
      Decision.associate(sequelize);
    }

    await sequelize.sync({ force: true });
  }, 120_000);

  afterAll(async () => {
    await sequelize.close();
    await container.stop();
  });

  beforeEach(async () => {
    // Truncate in dependency order to avoid FK issues
    await Decision.destroy({ where: {} as any, force: true });
    await OrderItem.destroy({ where: {} as any, force: true });
    await MarketplaceOrder.destroy({ where: {} as any, force: true });
    await UseCaseRequest.destroy({ where: {} as any, force: true });
    await Status.destroy({ where: {} as any, force: true });
    await MarketplaceUser.destroy({ where: {} as any, force: true });
  });

  it('returns zeros on an empty database', async () => {
    const summary = await MarketplaceSummaryReportDAO.getSummary();
    expect(summary).toEqual({ totalUsers: 0, totalUseCases: 0, totalOrders: 0 });
  });

  it('returns correct totals after seeding rows', async () => {
    // Seed baseline rows
    const u1 = await MarketplaceUser.create({ email: 'a@example.com' } as any);
    const u2 = await MarketplaceUser.create({ email: 'b@example.com' } as any);
    const u3 = await MarketplaceUser.create({ email: 'c@example.com' } as any);

    const statusNew = await Status.create({ code: 'NEW', name: 'New' } as any);

    const makeReqNum = () =>
      `REQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    await UseCaseRequest.create({
      requestNumber: makeReqNum(),
      requestedToolName: 'Tool A',
      description: 'First',
      requestorId: u1.id,
      statusId: statusNew.id,
    } as any);

    await UseCaseRequest.create({
      requestNumber: makeReqNum(),
      requestedToolName: 'Tool B',
      description: 'Second',
      requestorId: u2.id,
      statusId: statusNew.id,
    } as any);

    await MarketplaceOrder.create({ requestorId: u1.id, statusId: statusNew.id } as any);
    await MarketplaceOrder.create({ requestorId: u2.id, statusId: statusNew.id } as any);
    await MarketplaceOrder.create({ requestorId: u3.id, statusId: statusNew.id } as any);
    await MarketplaceOrder.create({ requestorId: u1.id, statusId: statusNew.id } as any); // 4th order

    const summary = await MarketplaceSummaryReportDAO.getSummary();
    expect(summary.totalUsers).toBe(3);
    expect(summary.totalUseCases).toBe(2);
    expect(summary.totalOrders).toBe(4);
  });

  it('honors the provided transaction (sees uncommitted inserts inside the same tx)', async () => {
    // Seed one baseline user outside the tx
    await MarketplaceUser.create({ email: 'base@example.com' } as any);

    await sequelize.transaction(async (tx: Transaction) => {
      // Inside tx, add additional rows not yet visible outside
      const tUser = await MarketplaceUser.create({ email: 't1@example.com' } as any, { transaction: tx });

      const statusNew = await Status.create({ code: 'NEW2', name: 'New2' } as any, { transaction: tx });

      await UseCaseRequest.create(
        {
          requestNumber: `REQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          requestedToolName: 'Tool T',
          description: 'Tx request',
          requestorId: tUser.id,
          statusId: statusNew.id,
        } as any,
        { transaction: tx }
      );

      await MarketplaceOrder.create(
        { requestorId: tUser.id, statusId: statusNew.id } as any,
        { transaction: tx }
      );

      // Query within the same tx sees uncommitted rows
      const summaryInTx = await MarketplaceSummaryReportDAO.getSummary({ transaction: tx });
      expect(summaryInTx).toEqual({ totalUsers: 2, totalUseCases: 1, totalOrders: 1 }); // base + tUser
    });

    // After commit, totals are >= 1 (actually 2 here)
    const final = await MarketplaceSummaryReportDAO.getSummary();
    expect(final.totalUsers).toBeGreaterThanOrEqual(1);
  });
});
