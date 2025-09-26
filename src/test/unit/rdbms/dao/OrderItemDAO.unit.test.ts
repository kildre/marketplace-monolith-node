jest.mock('../../../../rdbms/entities/OrderItem', () => {
  class OrderItem {
    static findAll = jest.fn();
    static bulkCreate = jest.fn();
  }
  return { OrderItem };
});

jest.mock('../../../../rdbms/entities/Product', () => {
  class Product {}
  return { Product };
});

import { OrderItem } from '../../../../main/rdbms/entities/OrderItem';
import { Product } from '../../../../main/rdbms/entities/Product';
import { OrderItemDAO } from '../../../../main/rdbms/dao/OrderItemDAO';

describe('OrderItemDAO', () => {
  const dao = new OrderItemDAO();

  beforeEach(() => {
    (OrderItem.findAll as any).mockReset?.();
    (OrderItem.bulkCreate as any).mockReset?.();
  });

  test('listByOrder includes product and sorts', async () => {
    (OrderItem.findAll as any).mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const items = await dao.listByOrder(123);
    expect(OrderItem.findAll).toHaveBeenCalledWith({
      where: { order_id: 123 } as any,
      include: [{ model: Product, as: 'product' }],
      order: [['id', 'ASC']],
    });
    expect(items).toHaveLength(2);
  });

  test('bulkCreateForOrder appends order_id', async () => {
    (OrderItem.bulkCreate as any).mockResolvedValue([]);
    await dao.bulkCreateForOrder(10, [{ product_id: 1 }, { product_id: 2 }] as any[]);
    expect(OrderItem.bulkCreate).toHaveBeenCalledWith(
      [{ product_id: 1, order_id: 10 }, { product_id: 2, order_id: 10 }],
    );
  });
});
