// src/dao/BaseDAO.ts
import {
  Model,
  ModelStatic,
  FindOptions,
  CreationAttributes,
  Transaction,
  Sequelize,
} from 'sequelize';
import { BaseDao, BaseDaoI } from './BaseDao';

export type TxOpt = { transaction?: Transaction };

export interface IdDaoI<M extends Model> extends BaseDaoI<M> {
  findById(
    id: number | string,
    options?: Omit<FindOptions, 'where'> & TxOpt  
  ): Promise<M | null>;
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

export class IdDao<M extends Model> extends BaseDao<M> implements IdDaoI<M> {
  constructor(model: ModelStatic<M>) {
    super(model);
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

  async findById(
    id: number,
    options?: Omit<FindOptions, 'where'> & TxOpt
  ): Promise<M | null> {
    return this.model.findByPk(id as any, options);
  }

  async updateById(
    id: number,
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
    id: number,
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
}
