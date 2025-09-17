import {
  Model,
  ModelStatic,
  FindOptions,
  CreationAttributes,
  Transaction,
  Lock,
} from 'sequelize';
import { sequelize } from '../../config/sequelizeCLIConfig.cjs';

type WithTx = { transaction?: Transaction };

export class BaseDAO<M extends Model> {
  protected model: ModelStatic<M>;

  constructor(model: ModelStatic<M>) {
    this.model = model;
  }

  /** Run in the provided tx, or open a managed one if none is given */
  protected async withTx<T>(
    tx: Transaction | undefined,
    fn: (t: Transaction) => Promise<T>
  ): Promise<T> {
    if (tx) return fn(tx);
    return sequelize.transaction(fn);
  }

  /** Expose a helper for callers that want a tx boundary */
  async runInTransaction<T>(fn: (t: Transaction) => Promise<T>): Promise<T> {
    return sequelize.transaction(fn);
  }

  // ----------------- CRUD -----------------

  /** CREATE (managed tx by default) */
  async create(
    data: CreationAttributes<M>,
    options?: WithTx
  ): Promise<M> {
    return this.withTx(options?.transaction, (t) =>
      this.model.create(data as any, { transaction: t })
    );
  }

  /** READ by PK (uses tx if provided; no managed tx to avoid overhead) */
  async findById(
    id: number | string,
    options?: Omit<FindOptions, 'where'> & WithTx
  ): Promise<M | null> {
    return this.model.findByPk(id as any, options);
  }

  /** READ many (uses tx if provided; no managed tx) */
  async findAll(
    options?: FindOptions & WithTx
  ): Promise<M[]> {
    return this.model.findAll(options);
  }

  /** UPDATE by PK (managed tx by default). Set `lockForUpdate=true` to row-lock during read-modify-write. */
  async updateById(
    id: number | string,
    data: Partial<CreationAttributes<M>>,
    options?: WithTx & { lockForUpdate?: boolean }
  ): Promise<M | null> {
    return this.withTx(options?.transaction, async (t) => {
      const instance = await this.model.findByPk(id as any, {
        transaction: t,
        ...(options?.lockForUpdate ? { lock: t.LOCK.UPDATE as Lock } : {}),
      });
      if (!instance) return null;
      await instance.update(data as any, { transaction: t });
      return instance;
    });
  }

  /** DELETE by PK (managed tx by default). Set `hard=true` for force delete. */
  async deleteById(
    id: number | string,
    options?: WithTx & { hard?: boolean; lockForUpdate?: boolean }
  ): Promise<boolean> {
    return this.withTx(options?.transaction, async (t) => {
      const instance = await this.model.findByPk(id as any, {
        transaction: t,
        ...(options?.lockForUpdate ? { lock: t.LOCK.UPDATE as Lock } : {}),
      });
      if (!instance) return false;

      if (options?.hard) {
        await instance.destroy({ force: true, transaction: t });
      } else {
        await instance.destroy({ transaction: t });
      }
      return true;
    });
  }
}
