/**
 * File: src/test/int/rdbms/dao/decision.dao.int.test.ts
 *
 * Runs Postgres in Testcontainers and wires DAO to runtime models that mirror app schema:
 * - Status:     { id, code }
 * - User:       { id, email }
 * - Request:    camelCase attrs w/ field mapping (requestNumber -> request_number)
 * - Order:      minimal
 * - Decision:   camelCase attrs w/ field mapping (e.g., statusId -> status_id)
 *
 * Verifies: createForRequest, listForRequest, listForOrder, updateStatus.
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

  // Local runtime models (shape mirrors your prod models)
  class MarketplaceUser extends Model {}
  class Status extends Model {}
  class UseCaseRequest extends Model {}
  class MarketplaceOrder extends Model {}
  class Decision extends Model {}

  // Will load after mocks
  let DecisionDAO: any;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('postgres:16')
        .withDatabase('testdb')
        .withUsername('test')
        .withPassword('test')
        .start();
    } catch (e) {
      console.warn(
        'Skipping DecisionDAO integration tests – no container runtime:',
        (e as Error)?.message
      );
      RUNTIME_UNAVAILABLE = true;
      return;
    }

    sequelize = new Sequelize(container.getConnectionUri(), { logging: false });

    // ----- Define runtime models (camelCase + field mappings) -----

    MarketplaceUser.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        email: { type: DataTypes.STRING(128), allowNull: false, unique: true },
        firstName: { type: DataTypes.STRING(64), allowNull: true, field: 'first_name' },
        lastName: { type: DataTypes.STRING(64), allowNull: true, field: 'last_name' },
      },
      { sequelize, tableName: 'marketplace_user', underscored: true, timestamps: false }
    );

    Status.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      },
      { sequelize, tableName: 'status', underscored: true, timestamps: false }
    );

    UseCaseRequest.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        requestNumber: { type: DataTypes.STRING(64), allowNull: false, unique: true, field: 'request_number' },
        requestorId: { type: DataTypes.INTEGER, allowNull: false, field: 'requestor_id' },
        statusId: { type: DataTypes.INTEGER, allowNull: false, field: 'status_id' },
      },
      { sequelize, tableName: 'use_case_request', underscored: true, timestamps: false }
    );

    MarketplaceOrder.init(
      {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        requestorId: { type: DataTypes.INTEGER, allowNull: false, field: 'requestor_id' },
        statusId: { type: DataTypes.INTEGER, allowNull: false, field: 'status_id' },
      },
      { sequelize, tableName: 'marketplace_order', underscored: true, timestamps: false }
    );

    Decision.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

        // Core columns
        decisionNumber: { type: DataTypes.STRING(32), allowNull: false, unique: true, field: 'decision_number' },
        ticketType: { type: DataTypes.STRING(64), allowNull: true, field: 'ticket_type' },
        asset: { type: DataTypes.STRING(128), allowNull: true },
        quantity: { type: DataTypes.INTEGER, allowNull: true },
        estimatedPrice: { type: DataTypes.DECIMAL(18, 2), allowNull: true, field: 'estimated_price' },
        comments: { type: DataTypes.STRING(1024), allowNull: false },

        // FKs as attributes (camelCase)
        adjudicatorId: { type: DataTypes.INTEGER, allowNull: false, field: 'adjudicator_id' },
        requestId: { type: DataTypes.INTEGER, allowNull: false, field: 'request_id' },
        orderId: { type: DataTypes.INTEGER, allowNull: false, field: 'order_id' },
        statusId: { type: DataTypes.INTEGER, allowNull: false, field: 'status_id' },

        // Optional timestamps/extra dates (not required by DAO)
        decisionAt: { type: DataTypes.DATE, allowNull: true, field: 'decision_at' },
        createdAt: { type: DataTypes.DATE, allowNull: true, field: 'created_at' },
        updatedAt: { type: DataTypes.DATE, allowNull: true, field: 'updated_at' },
      },
      { sequelize, tableName: 'decision', underscored: true, timestamps: false }
    );

    // ----- Associations (aliases must match DAO includes) -----
    UseCaseRequest.belongsTo(MarketplaceUser, { foreignKey: 'requestor_id', as: 'requestor' });
    UseCaseRequest.belongsTo(Status, { foreignKey: 'status_id', as: 'status' });

    MarketplaceOrder.belongsTo(MarketplaceUser, { foreignKey: 'requestor_id', as: 'requestor' });
    MarketplaceOrder.belongsTo(Status, { foreignKey: 'status_id', as: 'status' });

    Decision.belongsTo(MarketplaceUser, { foreignKey: { name: 'adjudicator_id', allowNull: false }, as: 'adjudicator' });
    Decision.belongsTo(UseCaseRequest, { foreignKey: { name: 'request_id', allowNull: false }, as: 'request' });
    Decision.belongsTo(MarketplaceOrder, { foreignKey: { name: 'order_id', allowNull: false }, as: 'order' });
    Decision.belongsTo(Status, { foreignKey: { name: 'status_id', allowNull: false }, as: 'status' });

    await sequelize.sync({ force: true });

    // ----- Mock DAO entity imports to use these runtime models -----
    jest.resetModules();
    jest.doMock('../../../../rdbms/entities/Decision', () => ({ Decision }), { virtual: true });
    jest.doMock('../../../../rdbms/entities/MarketplaceUser', () => ({ MarketplaceUser }), { virtual: true });
    jest.doMock('../../../../rdbms/entities/Status', () => ({ Status }), { virtual: true });

    // Import DAO after mocks in place
    const daoMod = await import('../../../../main/rdbms/dao/DecisionDAO');
    DecisionDAO = daoMod.DecisionDAO;

    jest.setTimeout(60_000);
  });

  afterAll(async () => {
    if (RUNTIME_UNAVAILABLE) return;
    await sequelize?.close();
    await container?.stop();
  });

  // ----- Helpers -----
  const uniq = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  async function seedBasics() {
    const [pending] = await Status.findOrCreate({
      where: { code: 'PENDING' },
      defaults: { code: 'PENDING' },
    });
    const [approved] = await Status.findOrCreate({
      where: { code: 'APPROVED' },
      defaults: { code: 'APPROVED' },
    });

    const [user] = await MarketplaceUser.findOrCreate({
      where: { email: 'judge@agency.gov' },
      defaults: { email: 'judge@agency.gov', firstName: 'Ada', lastName: 'Lovelace' },
    });

    const request = await UseCaseRequest.create({
      requestNumber: uniq('REQ'),
      requestorId: (user as any).id,
      statusId: (pending as any).id,
    });

    const order = await MarketplaceOrder.create({
      requestorId: (user as any).id,
      statusId: (pending as any).id,
    });

    return { user, pending, approved, request, order };
  }

  it('createForRequest inserts with FKs', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const dao = new DecisionDAO();
    const { user, request, pending, order } = await seedBasics();

    const created = await dao.createForRequest({
      decisionNumber: uniq('DEC'),
      comments: 'ok',
      adjudicatorId: (user as any).id,
      requestId: (request as any).id,
      orderId: (order as any).id,     // NOT NULL in our test schema
      statusId: (pending as any).id,
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
    expect((loaded as any)?.request?.requestNumber).toBeTruthy();
    expect((loaded as any)?.status?.code).toBe('PENDING');
    expect((loaded as any)?.order?.id).toBe((order as any).id);
  });

  it('listForRequest returns eager adjudicator & status ordered DESC by id', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const dao = new DecisionDAO();
    const { user, request, pending, approved, order } = await seedBasics();

    await dao.createForRequest({
      decisionNumber: uniq('DEC-R-1'),
      comments: 'first',
      adjudicatorId: (user as any).id,
      requestId: (request as any).id,
      orderId: (order as any).id,
      statusId: (pending as any).id,
    } as any);

    const second = await dao.createForRequest({
      decisionNumber: uniq('DEC-R-2'),
      comments: 'second',
      adjudicatorId: (user as any).id,
      requestId: (request as any).id,
      orderId: (order as any).id,
      statusId: (approved as any).id,
    } as any);

    const rows = await dao.listForRequest((request as any).id);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    // DESC by id: last inserted first
    expect((rows[0] as any).id).toBe((second as any).id);

    const first: any = rows[0];
    expect(first.adjudicator?.email).toBe('judge@agency.gov');
    expect(['PENDING', 'APPROVED']).toContain(first.status?.code);
  });

  it('listForOrder filters by orderId and includes associations', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const dao = new DecisionDAO();
    const { user, request, pending, approved, order } = await seedBasics();

    await dao.createForRequest({
      decisionNumber: uniq('DEC-O-1'),
      comments: 'linked',
      adjudicatorId: (user as any).id,
      requestId: (request as any).id,
      orderId: (order as any).id,
      statusId: (pending as any).id,
    } as any);

    await dao.createForRequest({
      decisionNumber: uniq('DEC-O-2'),
      comments: 'not linked',
      adjudicatorId: (user as any).id,
      requestId: (request as any).id,
      orderId: (order as any).id,
      statusId: (approved as any).id,
    } as any);

    const rows = await dao.listForOrder((order as any).id);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const r of rows as any[]) {
      expect(r.orderId ?? r.order_id).toBe((order as any).id);
      expect(r.adjudicator).toBeTruthy();
      expect(r.status).toBeTruthy();
    }
  });

  it('updateStatus commits and rolls back inside a tx', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const dao = new DecisionDAO();
    const { user, request, pending, approved, order } = await seedBasics();

    const created = await dao.createForRequest({
      decisionNumber: uniq('DEC-U-1'),
      comments: 'to update',
      adjudicatorId: (user as any).id,
      requestId: (request as any).id,
      orderId: (order as any).id,
      statusId: (pending as any).id,
    } as any);

    // commit path
    await sequelize.transaction(async (tx: Transaction) => {
      const updated = await dao.updateStatus((created as any).id, (approved as any).id, tx);
      const raw = (updated as any)?.get ? (updated as any).get({ plain: true }) : (updated as any);
      expect(raw.statusId ?? raw.status_id).toBe((approved as any).id);
    });
    const afterCommit = await Decision.findByPk((created as any).id);
    const rawCommit = (afterCommit as any)?.get?.({ plain: true }) ?? afterCommit;
    expect(rawCommit.statusId ?? rawCommit.status_id).toBe((approved as any).id);

    // rollback path
    await expect(
      sequelize.transaction(async (tx: Transaction) => {
        const updated = await dao.updateStatus((created as any).id, (pending as any).id, tx);
        const raw = (updated as any)?.get ? (updated as any).get({ plain: true }) : (updated as any);
        expect(raw.statusId ?? raw.status_id).toBe((pending as any).id);
        throw new Error('force rollback');
      })
    ).rejects.toThrow('force rollback');

    const afterRollback = await Decision.findByPk((created as any).id);
    const rawRollback = (afterRollback as any)?.get?.({ plain: true }) ?? afterRollback;
    // Remains approved since tx rolled back
    expect(rawRollback.statusId ?? rawRollback.status_id).toBe((approved as any).id);
  });
});
