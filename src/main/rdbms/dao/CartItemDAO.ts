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
}
