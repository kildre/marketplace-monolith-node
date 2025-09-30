// src/rdbms/entities/MarketplaceOrder.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { MarketplaceUser } from './MarketplaceUser';
import { Status } from './Status';
import { OrderItem } from './OrderItem';
import { Decision } from './Decision';

export class MarketplaceOrder
  extends Model<InferAttributes<MarketplaceOrder>, InferCreationAttributes<MarketplaceOrder>> {

  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;

  // foreign keys (handy for typing & direct access)
  declare requestorId: number; // requestor_id
  declare statusId: number;    // status_id

  declare requestor?: NonAttribute<MarketplaceUser>;
  declare status?: NonAttribute<Status>;
  declare items?: NonAttribute<OrderItem[]>;
  declare decisions?: NonAttribute<Decision[]>;

  static initModel(sequelize: Sequelize) {
    MarketplaceOrder.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        requestorId: { type: DataTypes.INTEGER, allowNull: false, field: 'requestor_id' },
        statusId: { type: DataTypes.INTEGER, allowNull: false, field: 'status_id' },
      },
      {
        sequelize,
        tableName: 'marketplace_order',
        underscored: true,
        timestamps: false, // keep false unless you add created_at/updated_at columns
        indexes: [
          { fields: ['requestor_id'] },
          { fields: ['status_id'] },
        ],
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, Status, OrderItem, Decision } = sequelize.models as any;

    MarketplaceOrder.belongsTo(MarketplaceUser, {
      as: 'requestor',
      foreignKey: { name: 'requestorId', allowNull: false },
    });

    MarketplaceOrder.belongsTo(Status, {
      as: 'status',
      foreignKey: { name: 'statusId', allowNull: false },
    });

    MarketplaceOrder.hasMany(OrderItem, {
      as: 'items',
      foreignKey: { name: 'orderId', allowNull: false },
    });

    MarketplaceOrder.hasMany(Decision, {
      as: 'decisions',
      foreignKey: { name: 'orderId', allowNull: false },
    });
  }
}
