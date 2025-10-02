// src/test/int/rdbms/dao/marketplace-order.dao.int.test.ts
import { Sequelize } from 'sequelize';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

import { MarketplaceOrderDAO } from '../../../../main/rdbms/dao/MarketplaceOrderDAO';

import { MarketplaceOrder } from '../../../../main/rdbms/entities/MarketplaceOrder';
import { MarketplaceUser } from '../../../../main/rdbms/entities/MarketplaceUser';
import { Status } from '../../../../main/rdbms/entities/Status';
import { OrderItem } from '../../../../main/rdbms/entities/OrderItem';
import { Decision } from '../../../../main/rdbms/entities/Decision';

describe('MarketplaceOrderDAO (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let sequelize: Sequelize;
  let dao: MarketplaceOrderDAO;

  let requestorA!: MarketplaceUser;
  let requestorB!: MarketplaceUser;
  let statusNew!: Status;
  let statusApproved!: Status;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16').start();
    sequelize = new Sequelize(container.getConnectionUri(), { logging: false });

    // Initialize models on THIS sequelize
    MarketplaceUser.initModel(sequelize);
    Status.initModel(sequelize);
    OrderItem.initModel(sequelize);
    Decision.initModel(sequelize);
    MarketplaceOrder.initModel(sequelize);

    // Wire only what MarketplaceOrder needs
    if (typeof (MarketplaceOrder as any).associate === 'function') {
      (MarketplaceOrder as any).associate(sequelize);
    }

    await sequelize.sync({ force: true });

    // Seed minimal rows
    requestorA = await MarketplaceUser.create({
      email: 'alice@example.com',
      first_name: 'Alice',
      last_name: 'Alpha',
    } as any);

    requestorB = await MarketplaceUser.create({
      email: 'bob@example.com',
      first_name: 'Bob',
      last_name: 'Beta',
    } as any);

    statusNew = await Status.create({ code: 'NEW', name: 'New' } as any);
    statusApproved = await Status.create({ code: 'APPROVED', name: 'Approved' } as any);

    dao = new MarketplaceOrderDAO();
  });

  afterAll(async () => {
    await sequelize.close();
    await container.stop();
  });

  beforeEach(async () => {
    await OrderItem.destroy({ where: {} as any });
    await MarketplaceOrder.destroy({ where: {} as any });
  });

  it('createWithItems() creates an order (no items) and returns it', async () => {
    const created = await dao.createWithItems(
      { requestorId: requestorA.id, statusId: statusNew.id } as any,
      [],
      { reloadWithItems: true }
    );

    expect(created.id).toBeTruthy();
    expect(created.requestorId).toBe(requestorA.id);
    expect(created.statusId).toBe(statusNew.id);
    expect(Array.isArray((created as any).items)).toBe(true);
    expect((created as any).items.length).toBe(0);

    // Robust persistence check (COUNT)
    const persisted = await MarketplaceOrder.count({ where: { id: created.id } as any });
    expect(persisted).toBe(1);
  });

  it('getWithItems() returns the order and (separate) items array', async () => {
    const order = await MarketplaceOrder.create({
      requestorId: requestorA.id,
      statusId: statusNew.id,
    });

    const fetched = await dao.getWithItems(order.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(order.id);
    expect(Array.isArray((fetched as any).items)).toBe(true);
    expect((fetched as any).items.length).toBe(0);
  });

  it('listByRequestor() returns orders filtered by requestor, eager loads requestor+status', async () => {
    const a1 = await MarketplaceOrder.create({ requestorId: requestorA.id, statusId: statusNew.id });
    const a2 = await MarketplaceOrder.create({ requestorId: requestorA.id, statusId: statusApproved.id });
    await MarketplaceOrder.create({ requestorId: requestorB.id, statusId: statusNew.id });

    const listA = await dao.listByRequestor(requestorA.id, { limit: 10, offset: 0 });

    expect(Array.isArray(listA)).toBe(true);
    expect(listA.length).toBeGreaterThan(0);
    if (listA.length > 1) {
      expect(listA[0].id).toBeGreaterThan(listA[1].id);
    }
    // Included associations
    expect(listA[0].requestor?.id).toBe(requestorA.id);
    expect(listA[0].status?.id).toBeDefined();

    // No leak from requestorB (association-based check)
    const leaked = listA.some(o => o.requestor?.id === requestorB.id);
    expect(leaked).toBe(false);

    // Sanity: listing for B returns only B’s orders
    const listB = await dao.listByRequestor(requestorB.id);
    expect(Array.isArray(listB)).toBe(true);
    expect(listB.every(o => o.requestor?.id === requestorB.id)).toBe(true);

    // Also verify that a known A-order is present
    const idsA = listA.map(o => o.id);
    expect(idsA).toEqual(expect.arrayContaining([a1.id, a2.id]));
  });

  it('listByRequestor(includeItems=true) also loads items with separate:true', async () => {
    const order = await MarketplaceOrder.create({
      requestorId: requestorA.id,
      statusId: statusNew.id,
    });

    // Insert a minimal OrderItem row (adjust fields if your schema requires more)
    await OrderItem.create({
      orderId: order.id,
      productId: 101,
      quantity: 2,
      unitPrice: '9.99',
    } as any);

    const listA = await dao.listByRequestor(requestorA.id, { includeItems: true });

    expect(Array.isArray(listA)).toBe(true);
    expect(listA.length).toBeGreaterThan(0);

    const found = listA.find(o => o.id === order.id);
    expect(found).toBeDefined();
    expect(Array.isArray((found as any).items)).toBe(true);
    expect((found as any).items.length).toBeGreaterThanOrEqual(1);

    // ensure nothing from requestorB leaked in
    const leaked = listA.some(o => o.requestor?.id === requestorB.id);
    expect(leaked).toBe(false);
  });

  it('listByStatusId() returns orders filtered by status, eager loads requestor+status', async () => {
    // Use a local status for test isolation
    const localStatus = await Status.create({ code: 'TMP', name: 'Temp' } as any);

    const o1 = await MarketplaceOrder.create({ requestorId: requestorA.id, statusId: localStatus.id });
    await MarketplaceOrder.create({ requestorId: requestorB.id, statusId: statusApproved.id });

    const withLocal = await dao.listByStatusId(localStatus.id);

    expect(Array.isArray(withLocal)).toBe(true);
    expect(withLocal.some(o => o.id === o1.id)).toBe(true);
    expect(withLocal.every(o => o.status?.id === localStatus.id)).toBe(true);
  });

  it('updateStatus() updates status id (attribute name)', async () => {
    const order = await MarketplaceOrder.create({ requestorId: requestorA.id, statusId: statusNew.id });

    const updatedCount = await dao.updateStatus(order.id, statusApproved.id);
    expect(updatedCount).toBe(1);

    const reloaded = await MarketplaceOrder.findByPk(order.id);
    expect(reloaded!.statusId).toBe(statusApproved.id);
  });
});
