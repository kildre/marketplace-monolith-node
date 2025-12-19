// src/dao/MarketplaceOrderDAO.ts
import {
  Transaction,
  CreationAttributes,
  FindOptions,
} from 'sequelize';
import { MarketplaceOrder } from '../entities/MarketplaceOrder';
import { OrderItem } from '../entities/OrderItem';
import { Status } from '../entities/Status';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { IdDao } from './IdDao';

type WithTx = { transaction?: Transaction };

export class MarketplaceOrderDAO extends IdDao<MarketplaceOrder> {
  constructor() {
    super(MarketplaceOrder);
  }

  async createWithItems(
    orderData: CreationAttributes<MarketplaceOrder>,
    items: CreationAttributes<OrderItem>[],
    opts: WithTx & { reloadWithItems?: boolean } = {}
  ): Promise<MarketplaceOrder> {
    const sequelize = MarketplaceOrder.sequelize!;
    const run = async (t: Transaction) => {
      const order = await MarketplaceOrder.create(orderData, { transaction: t });

      if (items?.length) {
        const rows = items.map((i) => ({
          ...i,
          orderId: order.id, // ✅ attribute name
        })) as CreationAttributes<OrderItem>[];
        await OrderItem.bulkCreate(rows, { transaction: t });
      }

      if (opts.reloadWithItems) {
        const reloaded = await MarketplaceOrder.findByPk(order.id, {
          transaction: t,
          include: [{ model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] }],
        });
        return reloaded!;
      }
      return order;
    };

    if (opts.transaction) return run(opts.transaction);
    return await sequelize.transaction(run);
  }

  async getWithItems(
    orderId: number,
    options: WithTx & { itemLimit?: number } = {}
  ): Promise<MarketplaceOrder | null> {
    return MarketplaceOrder.findByPk(orderId, {
      transaction: options.transaction,
      include: [
        {
          model: OrderItem,
          as: 'items',
          separate: true,
          ...(options.itemLimit ? { limit: options.itemLimit } : {}),
          order: [['id', 'ASC']],
        },
      ],
    });
  }

  async listByRequestor(
    requestorId: number,
    options: WithTx & {
      limit?: number;
      offset?: number;
      includeItems?: boolean;
      findOptions?: Omit<FindOptions, 'where' | 'include' | 'limit' | 'offset'>;
    } = {}
  ): Promise<MarketplaceOrder[]> {
    const include: Array<import('sequelize').Includeable> = [
      // ✅ no attributes list — avoid schema mismatches
      { model: MarketplaceUser, as: 'requestor' },
      { model: Status, as: 'status' },
    ];

    if (options.includeItems) {
      include.push({ model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] });
    }

    return MarketplaceOrder.findAll({
      where: { requestorId },
      include,
      order: [['id', 'DESC']],
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
      ...(options.findOptions ?? {}),
    });
  }

  async listByStatusId(
    statusId: number,
    options: WithTx & { limit?: number; offset?: number } = {}
  ): Promise<MarketplaceOrder[]> {
    return MarketplaceOrder.findAll({
      where: { statusId },
      include: [
        // ✅ no attributes list
        { model: MarketplaceUser, as: 'requestor' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
    });
  }

  async updateStatus(
    orderId: number,
    statusId: number,
    opts: WithTx = {}
  ): Promise<number> {
    const [count] = await MarketplaceOrder.update(
      { statusId }, // ✅ attribute name
      { where: { id: orderId }, transaction: opts.transaction }
    );
    return count;
  }
}
