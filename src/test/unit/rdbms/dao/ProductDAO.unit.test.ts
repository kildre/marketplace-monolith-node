jest.mock('../../../../main/rdbms/entities/Product', () => {
  class Product {
    static findOne = jest.fn();
    static findByPk = jest.fn();
  }
  return { Product };
});

jest.mock('../../../../main/rdbms/entities/OrderItem', () => {
  class OrderItem {}
  return { OrderItem };
});

import { Product } from '../../../../main/rdbms/entities/Product';
import { OrderItem } from '../../../../main/rdbms/entities/OrderItem';
import { ProductDAO } from '../../../../main/rdbms/dao/ProductDAO';

describe('ProductDAO', () => {
  const dao = new ProductDAO();

  beforeEach(() => {
    (Product.findOne as any).mockReset?.();
    (Product.findByPk as any).mockReset?.();
  });

  test('findByName', async () => {
    (Product.findOne as any).mockResolvedValue({ id: 9, name: 'Widget' });
    const p = await dao.findByName('Widget');
    expect(Product.findOne).toHaveBeenCalledWith({ where: { name: 'Widget' } });
    expect(p).toEqual({ id: 9, name: 'Widget' });
  });

  test('getWithOrderItems includes association', async () => {
    (Product.findByPk as any).mockResolvedValue({ id: 9, name: 'Widget' });
    const p = await dao.getWithOrderItems(9);
    expect(Product.findByPk).toHaveBeenCalledWith(9, {
      include: [{ model: OrderItem, as: 'orderItems' }],
    });
    expect(p).toEqual({ id: 9, name: 'Widget' });
  });
});
