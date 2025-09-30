// src/rdbms/entities/Status.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { UseCaseRequest } from './UseCaseRequest';
import { MarketplaceOrder } from './MarketplaceOrder';
import { Decision } from './Decision';

export class Status
  extends Model<InferAttributes<Status>, InferCreationAttributes<Status>> {

  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;
  declare code: string;

  // associations (mark as NonAttribute so Sequelize doesn't treat them as columns)
  declare requests?: NonAttribute<UseCaseRequest[]>;
  declare orders?: NonAttribute<MarketplaceOrder[]>;
  declare decisions?: NonAttribute<Decision[]>;

  static initModel(sequelize: Sequelize) {
    Status.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      },
      {
        sequelize,
        tableName: 'status',
        underscored: true,
        timestamps: false,
        indexes: [
          { unique: true, fields: ['code'] },
        ],
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { UseCaseRequest, MarketplaceOrder, Decision } = sequelize.models as any;

    Status.hasMany(UseCaseRequest, {
      foreignKey: { name: 'statusId', allowNull: false },
      as: 'requests',
    });

    Status.hasMany(MarketplaceOrder, {
      foreignKey: { name: 'statusId', allowNull: false },
      as: 'orders',
    });

    Status.hasMany(Decision, {
      foreignKey: { name: 'statusId', allowNull: false },
      as: 'decisions',
    });
  }
}
