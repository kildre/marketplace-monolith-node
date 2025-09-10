jest.mock('../../../../rdbms/entities/MarketplaceOrder', () => {
  class MarketplaceOrder {
    static create = jest.fn();
    static findByPk = jest.fn();
    static findAll = jest.fn();
  }
  return { MarketplaceOrder };
});

jest.mock('../../../../rdbms/entities/OrderItem', () => {
  class OrderItem {
    static create = jest.fn();
  }
  return { OrderItem };
});

jest.mock('../../../../rdbms/entities/MarketplaceUser', () => ({ MarketplaceUser: class MarketplaceUser {} }));
jest.mock('../../../../rdbms/entities/Status', () => ({ Status: class Status {} }));

import { MarketplaceOrder } from '../../../../rdbms/entities/MarketplaceOrder';
import { OrderItem } from '../../../../rdbms/entities/OrderItem';
import { MarketplaceUser } from '../../../../rdbms/entities/MarketplaceUser';
import { Status } from '../../../../rdbms/entities/Status';
import { MarketplaceOrderDAO } from '../../../../rdbms/dao/MarketplaceOrderDAO';

describe('MarketplaceOrderDAO', () => {
  const dao = new MarketplaceOrderDAO();

  beforeEach(() => {
    (MarketplaceOrder.create as any).mockReset?.();
    (OrderItem.create as any).mockReset?.();
    (MarketplaceOrder.findByPk as any).mockReset?.();
    (MarketplaceOrder.findAll as any).mockReset?.();
  });

  test('createWithItems creates order then each item', async () => {
    (MarketplaceOrder.create as any).mockResolvedValue({ id: 100 });
    (OrderItem.create as any).mockResolvedValue({});

    const tx = {} as any;
    const order = await dao.createWithItems({ requestor_id: 1 } as any, [
      { product_id: 7, qty: 2 },
      { product_id: 8, qty: 1 },
    ] as any[], tx);

    expect(MarketplaceOrder.create).toHaveBeenCalledWith({ requestor_id: 1 }, { transaction: tx });
    expect(OrderItem.create).toHaveBeenNthCalledWith(1, { product_id: 7, qty: 2, order_id: 100 }, { transaction: tx });
    expect(OrderItem.create).toHaveBeenNthCalledWith(2, { product_id: 8, qty: 1, order_id: 100 }, { transaction: tx });
    expect(order).toEqual({ id: 100 });
  });

  test('getWithItems includes items', async () => {
    (MarketplaceOrder.findByPk as any).mockResolvedValue({ id: 5 });
    const res = await dao.getWithItems(5);
    expect(MarketplaceOrder.findByPk).toHaveBeenCalledWith(5, {
      include: [{ model: OrderItem, as: 'items' }],
    });
    expect(res).toEqual({ id: 5 });
  });

  test('listByRequestor with includes and order', async () => {
    (MarketplaceOrder.findAll as any).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const res = await dao.listByRequestor(9);
    expect(MarketplaceOrder.findAll).toHaveBeenCalledWith({
      where: { requestor_id: 9 } as any,
      include: [
        { model: MarketplaceUser, as: 'requestor' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
    expect(res).toHaveLength(2);
  });
});
