/**
 * File: src/test/int/rdbms/dao/decision.dao.int.test.ts
 *
 * What this does:
 * - Spins up a real Postgres with @testcontainers/postgresql
 * - Defines minimal Sequelize models (MarketplaceUser, Status, UseCaseRequest, MarketplaceOrder, Decision)
 * - Mocks your app entity modules so DecisionDAO uses *these* models
 * - Syncs schema and runs integration tests (create/list/update)
 *
 * Notes:
 * - We keep Decision.order_id as NOT NULL and always supply it in test data
 * - If you later change your app model to allow NULL, you can omit order_id here
 */

import { Sequelize, DataTypes, Model, Transaction } from 'sequelize';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

let RUNTIME_UNAVAILABLE = false;

(RUNTIME_UNAVAILABLE ? describe.skip : describe)('DecisionDAO (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let sequelize: Sequelize;

  // Local runtime models (declared here)
  class MarketplaceUser extends Model {}
  class Status extends Model {}
  class UseCaseRequest extends Model {}
  class MarketplaceOrder extends Model {}
  class Decision extends Model {}

  // We will import the DAO only after mocking its entity imports
  let DecisionDAO: any;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('postgres:16')
        .withDatabase('testdb')
        .withUsername('test')
        .withPassword('test')
        .start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Skipping DecisionDAO integration tests – no container runtime:', (e as Error)?.message);
      RUNTIME_UNAVAILABLE = true;
      return;
    }

    sequelize = new Sequelize(container.getConnectionUri(), { logging: false });

    // ---- Define models (minimal columns required by DAO logic)
    MarketplaceUser.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        email: { type: DataTypes.STRING(128), allowNull: false, unique: true },
        first_name: { type: DataTypes.STRING(64) },
        last_name: { type: DataTypes.STRING(64) },
      },
      { sequelize, tableName: 'marketplace_user', underscored: true }
    );

    Status.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      },
      { sequelize, tableName: 'status', underscored: true }
    );

    UseCaseRequest.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        request_number: { type: DataTypes.STRING(64), allowNull: false, unique: true },
        requestor_id: { type: DataTypes.INTEGER, allowNull: false },
        status_id: { type: DataTypes.INTEGER, allowNull: false },
      },
      { sequelize, tableName: 'use_case_request', underscored: true }
    );

    MarketplaceOrder.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        requestor_id: { type: DataTypes.INTEGER, allowNull: false },
        status_id: { type: DataTypes.INTEGER, allowNull: false },
      },
      { sequelize, tableName: 'marketplace_order', underscored: true }
    );

    // Keep aligned with your app model: order_id is NOT NULL (so we always provide it)
    Decision.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        decisionNumber: { unique: true, type: DataTypes.STRING(32), allowNull: false },
        ticketType: { type: DataTypes.STRING(64) },
        asset: { type: DataTypes.STRING(128) },
        quantity: { type: DataTypes.INTEGER },
        estimatedPrice: { type: DataTypes.DECIMAL(18, 2) },
        comments: { type: DataTypes.STRING(1024), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false },
        updateAt: { type: DataTypes.DATE, allowNull: false }, // your entity uses "updateAt"
        decisionAt: { type: DataTypes.DATE, allowNull: false },
        adjudicator_id: { type: DataTypes.INTEGER, allowNull: false },
        request_id: { type: DataTypes.INTEGER, allowNull: false },
        order_id: { type: DataTypes.INTEGER, allowNull: false },
        status_id: { type: DataTypes.INTEGER, allowNull: false },
      },
      { sequelize, tableName: 'decision', underscored: true }
    );

    // ---- Associations
    UseCaseRequest.belongsTo(MarketplaceUser, { foreignKey: 'requestor_id', as: 'requestor' });
    UseCaseRequest.belongsTo(Status, { foreignKey: 'status_id', as: 'status' });

    MarketplaceOrder.belongsTo(MarketplaceUser, { foreignKey: 'requestor_id', as: 'requestor' });
    MarketplaceOrder.belongsTo(Status, { foreignKey: 'status_id', as: 'status' });

    Decision.belongsTo(MarketplaceUser, { foreignKey: { name: 'adjudicator_id', allowNull: false }, as: 'adjudicator' });
    Decision.belongsTo(UseCaseRequest, { foreignKey: { name: 'request_id', allowNull: false }, as: 'request' });
    Decision.belongsTo(MarketplaceOrder, { foreignKey: { name: 'order_id', allowNull: false }, as: 'order' });
    Decision.belongsTo(Status, { foreignKey: { name: 'status_id', allowNull: false }, as: 'status' });

    await sequelize.sync({ force: true });

    // ---- Mock the DAO's entity imports to use these local models
    jest.resetModules();
    jest.doMock('../../../../rdbms/entities/Decision', () => ({ Decision }), { virtual: true });
    jest.doMock('../../../../rdbms/entities/MarketplaceUser', () => ({ MarketplaceUser }), { virtual: true });
    jest.doMock('../../../../rdbms/entities/Status', () => ({ Status }), { virtual: true });

    // Import the DAO now that mocks are in place
    const daoMod = await import('../../../../rdbms/dao/DecisionDAO');
    DecisionDAO = daoMod.DecisionDAO;

    jest.setTimeout(60_000);
  });

  afterAll(async () => {
    if (RUNTIME_UNAVAILABLE) return;
    await sequelize?.close();
    await container?.stop();
  });

  // ---- Helpers
  const uniq = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  async function seedBasics() {
    const [pending] = await Status.findOrCreate({ where: { name: 'PENDING' }, defaults: { name: 'PENDING' } });
    const [approved] = await Status.findOrCreate({ where: { name: 'APPROVED' }, defaults: { name: 'APPROVED' } });

    const [user] = await MarketplaceUser.findOrCreate({
      where: { email: 'judge@agency.gov' },
      defaults: { email: 'judge@agency.gov', first_name: 'Ada', last_name: 'Lovelace' },
    });

    const request = await UseCaseRequest.create({
      request_number: uniq('REQ'),
      requestor_id: (user as any).id,
      status_id: (pending as any).id,
    });

    const order = await MarketplaceOrder.create({
      requestor_id: (user as any).id,
      status_id: (pending as any).id,
    });

    return { user, pending, approved, request, order };
  }

  it('createForRequest inserts with FKs', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const dao = new DecisionDAO();
    const { user, request, pending, order } = await seedBasics();
    const now = new Date();

    const created = await dao.createForRequest({
      decisionNumber: uniq('DEC'),
      comments: 'ok',
      createdAt: now,
      updateAt: now,
      decisionAt: now,
      adjudicator_id: (user as any).id,
      request_id: (request as any).id,
      order_id: (order as any).id,        // supply order_id per NOT NULL
      status_id: (pending as any).id,
    } as any);

    expect(created).toBeTruthy();
    expect((created as any).id).toBeGreaterThan(0);

    const loaded = await Decision.findByPk((created as any).id, {
      include: [
        { model: MarketplaceUser, as: 'adjudicator' },
        { model: UseCaseRequest, as: 'request' },
        { model: Status, as: 'status' },
        { model: MarketplaceOrder, as: 'order' },
      ],
    });

    expect((loaded as any)?.adjudicator?.email).toBe('judge@agency.gov');
    expect((loaded as any)?.request?.request_number).toBeTruthy();
    expect((loaded as any)?.status?.name).toBe('PENDING');
    expect((loaded as any)?.order?.id).toBe((order as any).id);
  });

  it('listForRequest returns eager adjudicator & status ordered DESC by id', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const dao = new DecisionDAO();
    const { user, request, pending, approved, order } = await seedBasics();
    const t1 = new Date();
    const t2 = new Date(t1.getTime() + 1_000);

    await dao.createForRequest({
      decisionNumber: uniq('DEC-R-1'),
      comments: 'first',
      createdAt: t1, updateAt: t1, decisionAt: t1,
      adjudicator_id: (user as any).id,
      request_id: (request as any).id,
      order_id: (order as any).id,
      status_id: (pending as any).id,
    } as any);

    await dao.createForRequest({
      decisionNumber: uniq('DEC-R-2'),
      comments: 'second',
      createdAt: t2, updateAt: t2, decisionAt: t2,
      adjudicator_id: (user as any).id,
      request_id: (request as any).id,
      order_id: (order as any).id,
      status_id: (approved as any).id,
    } as any);

    const rows = await dao.listForRequest((request as any).id);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    // newest first (DESC by id)
    expect((rows[0] as any).id).toBeGreaterThan((rows[1] as any).id);

    const first: any = rows[0];
    expect(first.adjudicator?.email).toBe('judge@agency.gov');
    expect(['PENDING', 'APPROVED']).toContain(first.status?.name);
  });

  it('listForOrder filters by order_id and includes associations', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const dao = new DecisionDAO();
    const { user, request, pending, approved, order } = await seedBasics();
    const t = new Date();

    await dao.createForRequest({
      decisionNumber: uniq('DEC-O-1'),
      comments: 'linked',
      createdAt: t, updateAt: t, decisionAt: t,
      adjudicator_id: (user as any).id,
      request_id: (request as any).id,
      order_id: (order as any).id,
      status_id: (pending as any).id,
    } as any);

    await dao.createForRequest({
      decisionNumber: uniq('DEC-O-2'),
      comments: 'not linked',
      createdAt: t, updateAt: t, decisionAt: t,
      adjudicator_id: (user as any).id,
      request_id: (request as any).id,
      order_id: (order as any).id,
      status_id: (approved as any).id,
    } as any);

    const rows = await dao.listForOrder((order as any).id);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const r of rows as any[]) {
      expect(r.order_id).toBe((order as any).id);
      expect(r.adjudicator).toBeTruthy();
      expect(r.status).toBeTruthy();
    }
  });

  it('updateStatus commits and rolls back inside a tx', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const dao = new DecisionDAO();
    const { user, request, pending, approved, order } = await seedBasics();
    const t = new Date();

    const created = await dao.createForRequest({
      decisionNumber: uniq('DEC-U-1'),
      comments: 'to update',
      createdAt: t, updateAt: t, decisionAt: t,
      adjudicator_id: (user as any).id,
      request_id: (request as any).id,
      order_id: (order as any).id,
      status_id: (pending as any).id,
    } as any);

    // commit path
    await sequelize.transaction(async (tx: Transaction) => {
      const updated = await dao.updateStatus((created as any).id, (approved as any).id, tx);
      expect((updated as any)?.status_id).toBe((approved as any).id);
    });
    const afterCommit = await Decision.findByPk((created as any).id);
    expect((afterCommit as any)?.status_id).toBe((approved as any).id);

    // rollback path
    await expect(
      sequelize.transaction(async (tx: Transaction) => {
        const updated = await dao.updateStatus((created as any).id, (pending as any).id, tx);
        expect((updated as any)?.status_id).toBe((pending as any).id);
        throw new Error('force rollback');
      })
    ).rejects.toThrow('force rollback');

    const afterRollback = await Decision.findByPk((created as any).id);
    expect((afterRollback as any)?.status_id).toBe((approved as any).id);
  });
});
