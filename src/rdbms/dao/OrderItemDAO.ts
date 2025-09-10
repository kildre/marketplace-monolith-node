import { BaseDAO } from './BaseDAO';
import { OrderItem } from '../entities/OrderItem';
import { Product } from '../entities/Product';

export class OrderItemDAO extends BaseDAO<OrderItem> {
  constructor() {
    super(OrderItem);
  }

  async listByOrder(orderId: number): Promise<OrderItem[]> {
    return OrderItem.findAll({
      where: { order_id: orderId } as any,
      include: [{ model: Product, as: 'product' }],
      order: [['id', 'ASC']],
    });
  }

  async bulkCreateForOrder(orderId: number, items: Partial<OrderItem>[]) {
    return OrderItem.bulkCreate(items.map(i => ({ ...i, order_id: orderId })) as any[]);
  }
}
