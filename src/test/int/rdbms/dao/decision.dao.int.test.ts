import { Sequelize, Transaction } from 'sequelize';
import { MarketplaceUser } from '../../../../main/rdbms/entities/MarketplaceUser';
import { UseCaseRequest } from '../../../../main/rdbms/entities/UseCaseRequest';
import { MarketplaceOrder } from '../../../../main/rdbms/entities/MarketplaceOrder';
import { Status } from '../../../../main/rdbms/entities/Status';
import { Decision } from '../../../../main/rdbms/entities/Decision';
import dao from '../../../../main/rdbms/dao/decisionDao';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

describe('DecisionDAO (integration)', () => {
  let container: StartedPostgreSqlContainer | undefined;
  let sequelize: Sequelize;

  let user!: MarketplaceUser;
  let statusNew!: Status;
  let statusApproved!: Status;
  let req1!: UseCaseRequest;
  let req2!: UseCaseRequest;
  let order1!: MarketplaceOrder;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();
    sequelize = new Sequelize(container.getConnectionUri(), { logging: false });

    // 1) Init ONLY the models you need tables for
    MarketplaceUser.initModel(sequelize);
    Status.initModel(sequelize);
    UseCaseRequest.initModel(sequelize);
    MarketplaceOrder.initModel(sequelize);
    Decision.initModel(sequelize);

    // 2) Wire ONLY Decision’s associations (it uses belongsTo to these models)
    if (typeof (Decision as any).associate === 'function') {
      (Decision as any).associate(sequelize);
    }

    // ❌ Do NOT call MarketplaceOrder.associate / MarketplaceUser.associate / etc. here.
    // They often reference other models (e.g., OrderItems) that you haven't initialized,
    // which causes "hasMany called with something that's not a subclass of Model".

    // 3) Create tables
    await sequelize.sync({ force: true });

    // 4) Seed minimal rows (same as you have now)
    user = await MarketplaceUser.create({ email: 'judge@example.com' });
    statusNew = await Status.create({ code: 'NEW' });
    statusApproved = await Status.create({ code: 'APPROVED' });

    const makeReqNum = () => `REQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    req1 = await UseCaseRequest.create({
      requestNumber: makeReqNum(),
      requestedToolName: 'Tool A',
      description: 'Test request A',
    });
    req2 = await UseCaseRequest.create({
      requestNumber: makeReqNum(),
      requestedToolName: 'Tool B',
      description: 'Test request B',
    });

    const requestor = await MarketplaceUser.create({ email: 'requestor@example.com' });
    order1 = await MarketplaceOrder.create({
      statusId: statusNew.id,
      requestorId: requestor.id,
    });
  });

  afterAll(async () => {
    await sequelize.close();
    await container?.stop();  // <— add this
  });

  const decisionBase = (overrides: Partial<Decision> = {}) => ({
    decisionNumber: `DEC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    ticketType: 'A',
    asset: 'Laptop',
    quantity: 2,
    estimatedPrice: '123.45',
    comments: 'initial comment',
    adjudicatorId: user.id,
    requestId: req1.id,
    orderId: order1.id,
    statusId: statusNew.id,
    ...overrides,
  });

  test('createForRequest inserts a Decision (with/without transaction) and returns it', async () => {
    // without tx
    const d1 = await dao.createForRequest(decisionBase());
    expect(d1.id).toBeTruthy();
    expect(d1.requestId).toBe(req1.id);
    expect(d1.statusId).toBe(statusNew.id);

    // with tx
    await sequelize.transaction(async (tx) => {
      const d2 = await dao.createForRequest(decisionBase({ ticketType: 'B' }), tx as Transaction);
      expect(d2.id).toBeTruthy();
      expect(d2.ticketType).toBe('B');
      // Ensure it’s visible after the transaction is committed (implicit by returning)
    });

    const count = await Decision.count({ where: { requestId: req1.id } });
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('listForRequest returns decisions filtered & ordered DESC by id, including adjudicator and status', async () => {
    // Add another decision for req1, and one for req2 to prove filtering
    const dA = await dao.createForRequest(decisionBase({ comments: 'for req1 - A' }));
    const dB = await dao.createForRequest(decisionBase({ comments: 'for req1 - B' }));
    await dao.createForRequest(decisionBase({ requestId: req2.id, comments: 'for req2' }));

    const items = await dao.listForRequest(req1.id);
    expect(items.length).toBeGreaterThanOrEqual(4);

    // Ordered DESC by id
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].id).toBeGreaterThanOrEqual(items[i].id);
    }

    // Includes
    const first = items[0];
    // lazy-loaded include check: the include should hydrate these
    expect(first.adjudicator?.email).toBe('judge@example.com');
    expect(first.status?.code).toBeDefined();
    // Filter sanity: none from req2 should appear
    const anyFromReq2 = items.some((d) => d.requestId === req2.id);
    expect(anyFromReq2).toBe(false);
  });

  test('listForOrder returns decisions filtered by order and includes relationships', async () => {
    // Create some for a different order to ensure filter works
    const requestor2 = await MarketplaceUser.create({ email: 'requestor2@example.com' });
    const order2 = await MarketplaceOrder.create({
      statusId: statusNew.id,
      requestorId: requestor2.id,
    });
    await dao.createForRequest(decisionBase({ orderId: order2.id, comments: 'other order' }));

    const items = await dao.listForOrder(order1.id);
    expect(items.length).toBeGreaterThan(0);

    const first = items[0];
    expect(first.orderId).toBe(order1.id);
    expect(first.adjudicator?.email).toBe('judge@example.com');
    expect(first.status?.code).toBeDefined();

    // Ensure none from order2 leak in
    const anyFromOrder2 = items.some((d) => d.orderId === order2.id);
    expect(anyFromOrder2).toBe(false);
  });

  test('updateStatus updates the status id and persists (with transaction)', async () => {
    const decision = await dao.createForRequest(decisionBase({ comments: 'to update' }));
    expect(decision.statusId).toBe(statusNew.id);

    await sequelize.transaction(async (tx) => {
      const updated = await dao.updateStatus(decision.id, statusApproved.id, tx as Transaction);
      expect(updated).not.toBeNull();
      expect(updated!.statusId).toBe(statusApproved.id);
    });

    const reloaded = await Decision.findByPk(decision.id, { include: [{ model: Status, as: 'status' }] as any });
    expect(reloaded!.statusId).toBe(statusApproved.id);
    expect((reloaded!.status as any).code).toBe('APPROVED');
  });

  test('updateStatus returns null if decision not found', async () => {
    const result = await dao.updateStatus(999999, statusApproved.id);
    expect(result).toBeNull();
  });
});
