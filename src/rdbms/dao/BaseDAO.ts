import {
  Model,
  ModelStatic,
  FindOptions,
  CreationAttributes,
  Transaction,
} from 'sequelize';
import { sequelize } from '../../config/sequelizeCLIConfig.cjs'; 

export class BaseDAO<M extends Model> {
  protected model: ModelStatic<M>;

  constructor(model: ModelStatic<M>) {
    this.model = model;
  }

  async create(
    data: CreationAttributes<M>,
    options?: { transaction?: Transaction }
  ): Promise<M> {
    return this.model.create(data as any, { transaction: options?.transaction });
  }

  async findById(
    id: number | string,
    options?: Omit<FindOptions, 'where'> & { transaction?: Transaction }
  ): Promise<M | null> {
    return this.model.findByPk(id as any, options);
  }

  async findAll(
    options?: FindOptions & { transaction?: Transaction }
  ): Promise<M[]> {
    return this.model.findAll(options);
  }

  async updateById(
    id: number | string,
    data: Partial<CreationAttributes<M>>,
    options?: { transaction?: Transaction }
  ): Promise<M | null> {
    const instance = await this.model.findByPk(id as any, { transaction: options?.transaction });
    if (!instance) return null;
    await instance.update(data as any, { transaction: options?.transaction });
    return instance;
  }

  async deleteById(
    id: number | string,
    options?: { transaction?: Transaction; hard?: boolean }
  ): Promise<boolean> {
    const instance = await this.model.findByPk(id as any, { transaction: options?.transaction });
    if (!instance) return false;
    if (options?.hard) {
      await instance.destroy({ force: true, transaction: options?.transaction });
    } else {
      await instance.destroy({ transaction: options?.transaction });
    }
    return true;
  }
}
