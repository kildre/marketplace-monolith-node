// src/dao/MarketplaceOrderDAO.ts
import {
  Transaction,
  CreationAttributes,
  FindOptions,
  Op,
} from 'sequelize';
import { BaseDAO } from './BaseDAO';
import { MarketplaceOrder } from '../entities/MarketplaceOrder';
import { OrderItem } from '../entities/OrderItem';
import { Status } from '../entities/Status';
import { MarketplaceUser } from '../entities/MarketplaceUser';

type WithTx = { transaction?: Transaction };

export class MarketplaceOrderDAO extends BaseDAO<MarketplaceOrder> {
  constructor() {
    super(MarketplaceOrder);
  }

  /**
   * Create an order and its items atomically.
   * If `tx` not provided, a transaction is created for you.
   * Set `reloadWithItems=true` to return the order with items eagerly loaded.
   */
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
          order_id: order.id, // FK
        })) as CreationAttributes<OrderItem>[];
        await OrderItem.bulkCreate(rows, { transaction: t });
      }

      if (opts.reloadWithItems) {
        // eager-load items only (others stay lazy)
        const reloaded = await MarketplaceOrder.findByPk(order.id, {
          transaction: t,
          include: [{ model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] }],
        });
        // `reloaded` will exist since we just created it
        return reloaded!;
      }
      return order;
    };

    if (opts.transaction) return run(opts.transaction);
    return await sequelize.transaction(run);
  }

  /**
   * Fetch order with items eagerly (items only).
   * Use `separate: true` to avoid join bloat on big hasMany.
   */
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

  /**
   * List orders by requestor with optional eager includes.
   * By default includes requestor & status; items stay lazy.
   */
  async listByRequestor(
    requestorId: number,
    options: WithTx & {
      limit?: number;
      offset?: number;
      includeItems?: boolean; // set true to also include items
      findOptions?: Omit<FindOptions, 'where' | 'include' | 'limit' | 'offset'>;
    } = {}
  ): Promise<MarketplaceOrder[]> {
    const include: Array<import('sequelize').Includeable> = [
      { model: MarketplaceUser, as: 'requestor', attributes: ['id', 'first_name', 'last_name'] },
      { model: Status, as: 'status', attributes: ['id', 'name'] },
    ];

    if (options.includeItems) {
      include.push({ model: OrderItem, as: 'items', separate: true, order: [['id', 'ASC']] });
    }

    return MarketplaceOrder.findAll({
      where: { requestor_id: requestorId },
      include,
      order: [['id', 'DESC']],
      // distinct: true, // safe for pagination with includes
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
      ...(options.findOptions ?? {}),
    });
  }

  /**
   * Convenience: list by status id (eager requestor+status).
   */
  async listByStatusId(
    statusId: number,
    options: WithTx & { limit?: number; offset?: number } = {}
  ): Promise<MarketplaceOrder[]> {
    return MarketplaceOrder.findAll({
      where: { status_id: statusId },
      include: [
        { model: MarketplaceUser, as: 'requestor', attributes: ['id', 'first_name', 'last_name'] },
        { model: Status, as: 'status', attributes: ['id', 'name'] },
      ],
      order: [['id', 'DESC']],
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
    });
  }

  /**
   * Optional helper: update status (atomic).
   */
  async updateStatus(
    orderId: number,
    statusId: number,
    opts: WithTx = {}
  ): Promise<number> {
    const [count] = await MarketplaceOrder.update(
      { status_id: statusId } as Partial<MarketplaceOrder>,
      { where: { id: orderId }, transaction: opts.transaction }
    );
    return count;
  }
}
