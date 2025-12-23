// src/dao/BaseDAO.ts
import {
  Model,
  ModelStatic,
  FindOptions,
  CreationAttributes,
  Transaction,
  Sequelize,
} from 'sequelize';

export type TxOpt = { transaction?: Transaction };

export interface BaseDaoI<M extends Model> {
  create(
    data: CreationAttributes<M>,
    options?: TxOpt
  ): Promise<M>;
  findById(
    id: number | string,
    options?: Omit<FindOptions, 'where'> & TxOpt  
  ): Promise<M | null>;
  findAll(
    options?: FindOptions & TxOpt
  ): Promise<M[]>;
  updateById(
    id: number | string,
    data: Partial<CreationAttributes<M>>,
    options?: TxOpt
  ): Promise<M | null>;
  deleteById(
    id: number | string,
    options?: TxOpt & { hard?: boolean }
  ): Promise<boolean>;
}

export class BaseDao<M extends Model> implements BaseDaoI<M> {
  protected readonly model: ModelStatic<M>;

  constructor(model: ModelStatic<M>) {
    this.model = model;
  }

  /** The Sequelize instance this model is bound to (safer than importing a global). */
  protected get sequelize(): Sequelize {
    const s = this.model.sequelize;
    if (!s) {
      throw new Error(
        `Model ${this.model.name} is not bound to a Sequelize instance. ` +
          'Did you call initModel(...) and initDb() before using the DAO?'
      );
    }
    return s;
  }

  async create(
    data: CreationAttributes<M>,
    options?: TxOpt
  ): Promise<M> {
    return this.model.create(data as any, { transaction: options?.transaction });
  }

  async findById(
    id: number | string,
    options?: Omit<FindOptions, 'where'> & TxOpt
  ): Promise<M | null> {
    return this.model.findByPk(id as any, options);
  }

  async findAll(
    options?: FindOptions & TxOpt
  ): Promise<M[]> {
    return this.model.findAll(options);
  }

  async updateById(
    id: number | string,
    data: Partial<CreationAttributes<M>>,
    options?: TxOpt
  ): Promise<M | null> {
    const instance = await this.model.findByPk(id as any, {
      transaction: options?.transaction,
    });
    if (!instance) return null;
    await instance.update(data as any, { transaction: options?.transaction });
    return instance;
  }

  async deleteById(
    id: number | string,
    options?: TxOpt & { hard?: boolean }
  ): Promise<boolean> {
    const instance = await this.model.findByPk(id as any, {
      transaction: options?.transaction,
    });
    if (!instance) return false;

    await instance.destroy({
      force: Boolean(options?.hard),
      transaction: options?.transaction,
    });
    return true;
  }

  /**
   * Optional helper for managed transactions using the model-bound Sequelize.
   * Usage:
   *   await this.withManagedTx(async (tx) => { ... }, options?.transaction)
   */
  protected async withManagedTx<T>(
    fn: (tx: Transaction) => Promise<T>,
    tx?: Transaction
  ): Promise<T> {
    if (tx) return fn(tx);
    return this.sequelize.transaction(fn);
  }
}
