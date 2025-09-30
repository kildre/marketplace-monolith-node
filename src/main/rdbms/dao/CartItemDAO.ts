// src/rdbms/dao/CartItemDAO.ts
import {
  FindOptions,
  Includeable,
  Sequelize,
  Transaction,
  Op,
} from 'sequelize';
import { CartItem } from '../entities/CartItem';

type WithTx = { transaction?: Transaction };

type IncludeFlags = {
  includeRequest?: boolean;
  includeProduct?: boolean;
};

type PageOpts = { limit?: number; offset?: number };

type CommonOpts = WithTx &
  IncludeFlags & {
    extraInclude?: Includeable[];
    findOptions?: Omit<
      FindOptions,
      'where' | 'include' | 'limit' | 'offset' | 'transaction'
    >;
  };

export class CartItemDAO {
  protected readonly model = CartItem;

  /** Reuse the same Sequelize instance the model is bound to */
  protected get sequelize(): Sequelize {
    const s = this.model.sequelize;
    if (!s) {
      throw new Error(
        `Model ${this.model.name} is not bound to a Sequelize instance. ` +
          'Did you call initModel(...) and initialize associations before using the DAO?'
      );
    }
    return s;
  }

  /** Build safe includes with the correct aliases */
  private buildIncludes(flags: IncludeFlags, extra?: Includeable[]): Includeable[] | undefined {
    const { UseCaseRequest, Product } = this.sequelize.models as any;

    const include: Includeable[] = [];
    if (flags.includeRequest) include.push({ model: UseCaseRequest, as: 'request' });
    if (flags.includeProduct) include.push({ model: Product, as: 'product' });

    if (extra?.length) include.push(...extra);
    return include.length ? include : undefined;
  }

  // ---------- CRUD ----------

  async create(
    data: {
      requestId: number;
      productId: number;
      quantity: number;
    },
    opts: WithTx = {}
  ): Promise<CartItem> {
    console.log("Creating CartItem:", data);
    return this.model.create(
      {
        requestId: data.requestId,
        productId: data.productId,
        quantity: data.quantity,
      } as any,
      { transaction: opts.transaction }
    );
  }

  async bulkCreateForRequest(
    requestId: number,
    items: Array<{ productId: number; quantity: number }>,
    opts: WithTx & { ignoreDuplicates?: boolean } = {}
  ): Promise<CartItem[]> {
    if (!items.length) return [];
    return this.model.bulkCreate(
      items.map((i) => ({ requestId, productId: i.productId, quantity: i.quantity })) as any[],
      {
        transaction: opts.transaction,
        ignoreDuplicates: opts.ignoreDuplicates ?? false,
        validate: true,
      }
    );
  }

  async findById(
    id: number,
    options: CommonOpts = {}
  ): Promise<CartItem | null> {
    const include = this.buildIncludes(options, options.extraInclude);
    return this.model.findByPk(id, {
      include,
      transaction: options.transaction,
      ...(options.findOptions ?? {}),
    });
  }

  async findByRequestId(
    requestId: number,
    options: CommonOpts & PageOpts = {}
  ): Promise<CartItem[]> {
    const include = this.buildIncludes(options, options.extraInclude);
    return this.model.findAll({
      where: { requestId } as any,
      include,
      limit: options.limit,
      offset: options.offset,
      order: [['id', 'ASC']],
      transaction: options.transaction,
      ...(options.findOptions ?? {}),
    });
  }

  async findByRequestAndProduct(
    requestId: number,
    productId: number,
    options: CommonOpts = {}
  ): Promise<CartItem | null> {
    const include = this.buildIncludes(options, options.extraInclude);
    return this.model.findOne({
      where: { requestId, productId } as any,
      include,
      transaction: options.transaction,
      ...(options.findOptions ?? {}),
    });
  }

  async updateQuantity(
    id: number,
    quantity: number,
    opts: WithTx = {}
  ): Promise<number> {
    const [count] = await this.model.update(
      { quantity } as any,
      { where: { id } as any, transaction: opts.transaction }
    );
    return count; // number of rows updated
  }

  async deleteById(id: number, opts: WithTx = {}): Promise<number> {
    return this.model.destroy({
      where: { id } as any,
      transaction: opts.transaction,
    });
  }

  async deleteAllForRequest(requestId: number, opts: WithTx = {}): Promise<number> {
    return this.model.destroy({
      where: { requestId } as any,
      transaction: opts.transaction,
    });
  }

  // ---------- Utilities ----------

  /** Returns a map of productId -> quantity for a request. */
  async getQuantitiesForRequest(
    requestId: number,
    opts: WithTx = {}
  ): Promise<Record<number, number>> {
    const rows = await this.model.findAll({
      attributes: ['productId', 'quantity'],
      where: { requestId } as any,
      transaction: opts.transaction,
    });

    const out: Record<number, number> = {};
    for (const r of rows) out[r.productId] = r.quantity;
    return out;
  }

  /** Upsert by (requestId, productId) — increments or sets quantity. */
  async upsertItem(
    params: { requestId: number; productId: number; quantity: number },
    opts: WithTx & { increment?: boolean } = {}
  ): Promise<CartItem> {
    const tx = opts.transaction;
    const existing = await this.findByRequestAndProduct(
      params.requestId,
      params.productId,
      { transaction: tx }
    );

    if (!existing) {
      return this.create(params, { transaction: tx });
    }

    const nextQty = opts.increment
      ? (existing.quantity ?? 0) + params.quantity
      : params.quantity;

    await this.updateQuantity(existing.id, nextQty, { transaction: tx });
    // Refresh row
    return (await this.findById(existing.id, { transaction: tx })) as CartItem;
  }

  /** Remove multiple items by productIds for a request */
  async deleteByProductIds(
    requestId: number,
    productIds: number[],
    opts: WithTx = {}
  ): Promise<number> {
    if (!productIds.length) return 0;
    return this.model.destroy({
      where: { requestId, productId: { [Op.in]: productIds } } as any,
      transaction: opts.transaction,
    });
  }
}
