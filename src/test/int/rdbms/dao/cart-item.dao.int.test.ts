import { Sequelize, Transaction } from 'sequelize';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

import { CartItem } from '../../../../main/rdbms/entities/CartItem';
import { UseCaseRequest } from '../../../../main/rdbms/entities/UseCaseRequest';
import { Product } from '../../../../main/rdbms/entities/Product';
import { CartItemDAO } from '../../../../main/rdbms/dao/CartItemDAO';

describe('CartItemDAO (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let sequelize: Sequelize;
  let dao: CartItemDAO;

  let req1!: UseCaseRequest;
  let req2!: UseCaseRequest;
  let prod1!: Product;
  let prod2!: Product;

  const makeReqNum = () =>
    `REQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const makeSku = () =>
    `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  beforeAll(async () => {
    // 1) Boot Postgres + Sequelize
    container = await new PostgreSqlContainer('postgres:16').start();
    sequelize = new Sequelize(container.getConnectionUri(), { logging: false });

    // 2) Init models on THIS sequelize
    UseCaseRequest.initModel(sequelize);
    Product.initModel(sequelize);
    CartItem.initModel(sequelize);

    // 3) Wire ONLY CartItem’s needed associations
    //    (Do NOT call other models' associate() to avoid pulling in extra deps.)
    if (typeof (CartItem as any).associate === 'function') {
      (CartItem as any).associate(sequelize);
    }

    // 4) Create tables
    await sequelize.sync({ force: true });

    // 5) Seed minimal rows (add any other NOT NULL columns your schema needs)
    req1 = await UseCaseRequest.create({
      requestNumber: makeReqNum(),
      requestedToolName: 'Tool A',
      description: 'Seed A',
    });
    req2 = await UseCaseRequest.create({
      requestNumber: makeReqNum(),
      requestedToolName: 'Tool B',
      description: 'Seed B',
    });

    prod1 = await Product.create({
      name: 'Widget A',
      sku: makeSku(),
      price: '10.00',
      // add any other required columns (e.g., categoryId) as needed
    } as any);

    prod2 = await Product.create({
      name: 'Widget B',
      sku: makeSku(),
      price: '20.00',
    } as any);

    dao = new CartItemDAO();
  });

  afterAll(async () => {
    await sequelize.close();
    await container.stop();
  });

  beforeEach(async () => {
    // clean per test but keep reference seeds
    await CartItem.destroy({ where: {} as any });
  });

  const makeItem = async (overrides: Partial<CartItem> = {}) =>
    CartItem.create({
      requestId: req1.id,
      productId: prod1.id,
      quantity: 1,
      ...(overrides as any),
    } as any);

  it('create() inserts one cart item', async () => {
    const created = await dao.create(
      { requestId: req1.id, productId: prod1.id, quantity: 3 },
      {},
    );
    expect(created.id).toBeTruthy();
    expect(created.requestId).toBe(req1.id);
    expect(created.productId).toBe(prod1.id);
    expect(created.quantity).toBe(3);

    const found = await CartItem.findByPk(created.id);
    expect(found).not.toBeNull();
  });

  it('bulkCreateForRequest() inserts many and returns the created rows', async () => {
    const created = await dao.bulkCreateForRequest(
      req1.id,
      [
        { productId: prod1.id, quantity: 5 },
        { productId: prod2.id, quantity: 2 },
      ],
      {},
    );
    expect(created.length).toBe(2);

    const all = await CartItem.findAll({ order: [['id', 'ASC']] });
    expect(all.map((x) => x.requestId)).toEqual([req1.id, req1.id]);
    expect(all.map((x) => x.productId)).toEqual([prod1.id, prod2.id]);
    expect(all.map((x) => x.quantity)).toEqual([5, 2]);
  });

  it('bulkCreateForRequest() with empty items returns [] and does not insert', async () => {
    const created = await dao.bulkCreateForRequest(req1.id, [], {});
    expect(created).toEqual([]);
    const count = await CartItem.count();
    expect(count).toBe(0);
  });

  it('findById() returns null when missing', async () => {
    const res = await dao.findById(999999);
    expect(res).toBeNull();
  });

  it('findById() with include flags hydrates request and product', async () => {
    const base = await makeItem({ quantity: 4 });
    const found = await dao.findById(base.id, {
      includeRequest: true,
      includeProduct: true,
    });
    expect(found).not.toBeNull();
    expect(found!.id).toBe(base.id);
    expect(found!.request?.id).toBe(req1.id);
    expect(found!.product?.id).toBe(prod1.id);
  });

  it('findByRequestId() filters by request, supports pagination + include', async () => {
    // items for req1
    const a = await makeItem({ quantity: 1, productId: prod1.id });
    const b = await makeItem({ quantity: 2, productId: prod2.id });
    const c = await makeItem({ quantity: 3, productId: prod1.id });
    // one for req2
    await makeItem({ requestId: req2.id, productId: prod2.id, quantity: 99 });

    // page (limit=2, offset=1) for req1, include product
    const page = await dao.findByRequestId(req1.id, {
      includeProduct: true,
      limit: 2,
      offset: 1,
    });

    // Should be b, c in ASC id order
    expect(page.length).toBe(2);
    expect(page[0].id).toBe(b.id);
    expect(page[1].id).toBe(c.id);
    expect(page[0].product?.id).toBeDefined();
    expect(page[1].product?.id).toBeDefined();

    // ensure none from req2 leaked
    const anyFromReq2 = page.some((it) => it.requestId === req2.id);
    expect(anyFromReq2).toBe(false);
  });

  it('updateQuantity() returns number of rows updated and persists', async () => {
    const base = await makeItem({ quantity: 1 });
    const count = await dao.updateQuantity(base.id, 7);
    expect(count).toBe(1);

    const reloaded = await CartItem.findByPk(base.id);
    expect(reloaded!.quantity).toBe(7);
  });

  it('updateQuantity() returns 0 for unknown id', async () => {
    const count = await dao.updateQuantity(999999, 3);
    expect(count).toBe(0);
  });

  it('deleteById() removes and returns number of rows deleted', async () => {
    const base = await makeItem({ quantity: 5 });
    const n = await dao.deleteById(base.id);
    expect(n).toBe(1);
    const missing = await CartItem.findByPk(base.id);
    expect(missing).toBeNull();
  });

  it('create/bulkCreate support transactions', async () => {
    await sequelize.transaction(async (tx: Transaction) => {
      const one = await dao.create(
        { requestId: req1.id, productId: prod1.id, quantity: 11 },
        { transaction: tx },
      );
      expect(one.id).toBeTruthy();

      const many = await dao.bulkCreateForRequest(
        req1.id,
        [
          { productId: prod1.id, quantity: 12 },
          { productId: prod2.id, quantity: 13 },
        ],
        { transaction: tx },
      );
      expect(many.length).toBe(2);
    });

    const all = await CartItem.findAll();
    expect(all.length).toBe(3);
    expect(all.map((x) => x.quantity).sort((x, y) => x - y)).toEqual([11, 12, 13]);
  });
});
