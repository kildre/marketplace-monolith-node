// src/test/unit/rdbms/dao/MarketplaceOrderDAO.unit.test.ts

// ---- Mocks ----
jest.mock('../../../../main/rdbms/entities/MarketplaceOrder', () => {
  class MarketplaceOrder {
    static create = jest.fn();
    static findByPk = jest.fn();
    static findAll = jest.fn();
    static update = jest.fn();
    // NOTE: we won't rely on typing of .sequelize; we'll assign it as any in tests
    static sequelize?: any;
    id!: number;
  }
  return { MarketplaceOrder };
});

jest.mock('../../../../main/rdbms/entities/OrderItem', () => {
  class OrderItem {
    static bulkCreate = jest.fn();
  }
  return { OrderItem };
});

jest.mock('../../../../main/rdbms/entities/MarketplaceUser', () => ({
  MarketplaceUser: class MarketplaceUser { }
}));

jest.mock('../../../../main/rdbms/entities/Status', () => ({
  Status: class Status { }
}));

// ---- Imports under test ----
import { MarketplaceOrderDAO } from '../../../../main/rdbms/dao/MarketplaceOrderDAO';
import { MarketplaceOrder } from '../../../../main/rdbms/entities/MarketplaceOrder';
import { OrderItem } from '../../../../main/rdbms/entities/OrderItem';
import { MarketplaceUser } from '../../../../main/rdbms/entities/MarketplaceUser';
import { Status } from '../../../../main/rdbms/entities/Status';

describe('MarketplaceOrderDAO (unit)', () => {
  const dao = new MarketplaceOrderDAO();
  const tx = Symbol('tx') as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------- createWithItems --------
  it('createWithItems uses provided transaction and creates items with order_id', async () => {
    (MarketplaceOrder.create as any).mockResolvedValue({ id: 123 });
    (OrderItem.bulkCreate as any).mockResolvedValue(undefined);

    const order = await dao.createWithItems(
      { requestor_id: 9 } as any,
      [{ product_id: 7, qty: 2 } as any, { product_id: 8, qty: 1 } as any],
      { transaction: tx }
    );

    expect(MarketplaceOrder.create).toHaveBeenCalledWith(
      { requestor_id: 9 },
      { transaction: tx }
    );
    expect(OrderItem.bulkCreate).toHaveBeenCalledWith(
      [
        { product_id: 7, qty: 2, order_id: 123 },
        { product_id: 8, qty: 1, order_id: 123 },
      ],
      { transaction: tx }
    );
    expect(order).toEqual({ id: 123 });
  });

  it('createWithItems opens a managed transaction when none provided', async () => {
    // assign a mock sequelize to the model (cast to any to avoid TS18048)
    const sequelizeMock = { transaction: jest.fn(async (fn) => fn({ __tx: true })) };
    (MarketplaceOrder as any).sequelize = sequelizeMock;

    (MarketplaceOrder.create as any).mockResolvedValue({ id: 1 });
    (OrderItem.bulkCreate as any).mockResolvedValue(undefined);

    await dao.createWithItems({ requestor_id: 1 } as any, [] as any[]);

    expect(sequelizeMock.transaction).toHaveBeenCalledTimes(1);
    expect(MarketplaceOrder.create).toHaveBeenCalledWith(
      { requestor_id: 1 },
      { transaction: expect.objectContaining({ __tx: true }) }
    );
    expect(OrderItem.bulkCreate).not.toHaveBeenCalled();
  });

  it('createWithItems can reload with items eagerly when reloadWithItems=true', async () => {
    (MarketplaceOrder.create as any).mockResolvedValue({ id: 44 });
    (OrderItem.bulkCreate as any).mockResolvedValue(undefined);
    const reloaded = { id: 44, items: [{ id: 1 }, { id: 2 }] };
    (MarketplaceOrder.findByPk as any).mockResolvedValue(reloaded);

    const result = await dao.createWithItems(
      { requestor_id: 9 } as any,
      [{ product_id: 1 } as any],
      { transaction: tx, reloadWithItems: true }
    );

    expect(MarketplaceOrder.findByPk).toHaveBeenCalledWith(
      44,
      expect.objectContaining({
        transaction: tx,
        include: [
          expect.objectContaining({
            model: OrderItem,
            as: 'items',
            separate: true,
            order: [['id', 'ASC']],
          }),
        ],
      })
    );
    expect(result).toBe(reloaded);
  });

  // -------- getWithItems --------
  it('getWithItems includes items with separate=true and optional limit', async () => {
    (MarketplaceOrder.findByPk as any).mockResolvedValue({ id: 5 });

    const res = await dao.getWithItems(5, { transaction: tx, itemLimit: 10 });

    expect(MarketplaceOrder.findByPk).toHaveBeenCalledWith(5, {
      transaction: tx,
      include: [
        {
          model: OrderItem,
          as: 'items',
          separate: true,
          limit: 10,
          order: [['id', 'ASC']],
        },
      ],
    });
    expect(res).toEqual({ id: 5 });
  });

  it('getWithItems includes items without limit when not provided', async () => {
    (MarketplaceOrder.findByPk as any).mockResolvedValue({ id: 6 });

    await dao.getWithItems(6);

    expect(MarketplaceOrder.findByPk).toHaveBeenCalledWith(6, {
      transaction: undefined,
      include: [
        {
          model: OrderItem,
          as: 'items',
          separate: true,
          order: [['id', 'ASC']],
        },
      ],
    });
  });

  // -------- listByRequestor --------
  it('listByRequestor includes requestor & status; items lazy by default', async () => {
    (MarketplaceOrder.findAll as any).mockResolvedValue([{ id: 1 }]);

    const res = await dao.listByRequestor(9, { transaction: tx });

    expect(MarketplaceOrder.findAll).toHaveBeenCalledWith({
      where: { requestorId: 9 }, // camelCase to match DAO
      include: [
        { model: MarketplaceUser, as: 'requestor', attributes: ['id', 'first_name', 'last_name'] },
        { model: Status, as: 'status', attributes: ['id', 'code'] }, // 'code' not 'name'
      ],
      order: [['id', 'DESC']],
      limit: undefined,
      offset: undefined,
      transaction: tx,
    });
    expect(res).toEqual([{ id: 1 }]);
  });

  it('listByRequestor can include items and respect limit/offset/findOptions', async () => {
    (MarketplaceOrder.findAll as any).mockResolvedValue([{ id: 2 }]);

    await dao.listByRequestor(7, {
      includeItems: true,
      limit: 50,
      offset: 100,
      transaction: tx,
      findOptions: { attributes: ['id'] },
    });

    expect(MarketplaceOrder.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestorId: 7 }, // camelCase
        limit: 50,
        offset: 100,
        transaction: tx,
        order: [['id', 'DESC']], // DAO includes top-level order
        include: expect.arrayContaining([
          { model: MarketplaceUser, as: 'requestor', attributes: ['id', 'first_name', 'last_name'] },
          { model: Status, as: 'status', attributes: ['id', 'code'] }, // 'code'
          expect.objectContaining({
            model: OrderItem,
            as: 'items',
            separate: true,
            order: [['id', 'ASC']],
          }),
        ]),
        attributes: ['id'],
      }),
    );
  });

  // -------- listByStatusId --------
  it('listByStatusId adds requestor & status includes', async () => {
    (MarketplaceOrder.findAll as any).mockResolvedValue([{ id: 3 }]);

    const res = await dao.listByStatusId(2, { transaction: tx, limit: 10, offset: 5 });

    expect(MarketplaceOrder.findAll).toHaveBeenCalledWith({
      where: { statusId: 2 }, // camelCase
      include: [
        { model: MarketplaceUser, as: 'requestor', attributes: ['id', 'first_name', 'last_name'] },
        { model: Status, as: 'status', attributes: ['id', 'name'] }, // expect 'name'
      ],
      limit: 10,
      offset: 5,
      order: [['id', 'DESC']],
      transaction: tx,
    });
    expect(res).toEqual([{ id: 3 }]);
  });

  // -------- updateStatus --------
  it('updateStatus updates and returns affected count', async () => {
    (MarketplaceOrder.update as any).mockResolvedValue([1]);

    const n = await dao.updateStatus(42, 5, { transaction: tx });

    expect(MarketplaceOrder.update).toHaveBeenCalledWith(
      { status_id: 5 }, // keep snake_case for DB column in payload
      { where: { id: 42 }, transaction: tx }
    );
    expect(n).toBe(1);
  });
});
