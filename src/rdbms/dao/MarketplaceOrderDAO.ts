import { Transaction } from 'sequelize';
import { BaseDAO } from './BaseDAO';
import { MarketplaceOrder } from '../entities/MarketplaceOrder';
import { OrderItem } from '../entities/OrderItem';
import { Status } from '../entities/Status';
import { MarketplaceUser } from '../entities/MarketplaceUser';

export class MarketplaceOrderDAO extends BaseDAO<MarketplaceOrder> {
  constructor() {
    super(MarketplaceOrder);
  }

  async createWithItems(
    orderData: Partial<MarketplaceOrder>,
    items: Partial<OrderItem>[],
    tx: Transaction
  ): Promise<MarketplaceOrder> {
    const order = await MarketplaceOrder.create(orderData as any, { transaction: tx });
    for (const item of items) {
      await OrderItem.create({ ...item, order_id: (order as any).id } as any, { transaction: tx });
    }
    return order;
  }

  async getWithItems(orderId: number): Promise<MarketplaceOrder | null> {
    return MarketplaceOrder.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items' }],
    });
  }

  async listByRequestor(requestorId: number): Promise<MarketplaceOrder[]> {
    return MarketplaceOrder.findAll({
      where: { requestor_id: requestorId } as any,
      include: [
        { model: MarketplaceUser, as: 'requestor' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
  }
}
