import { DataTypes, Model, Sequelize } from 'sequelize';

export class MarketplaceOrder extends Model {
  public id!: number;

  static initModel(sequelize: Sequelize) {
    MarketplaceOrder.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      },
      { sequelize, tableName: 'marketplace_order', underscored: true, timestamps: false }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, Status, OrderItem, Decision } = sequelize.models as any;

    MarketplaceOrder.belongsTo(MarketplaceUser, {
      as: 'requestor',
      foreignKey: { name: 'requestor_id', allowNull: false },
    });

    MarketplaceOrder.belongsTo(Status, {
      as: 'status',
      foreignKey: { name: 'status_id', allowNull: false },
    });

    MarketplaceOrder.hasMany(OrderItem, {
      as: 'items',
      foreignKey: { name: 'order_id', allowNull: false },
    });

    MarketplaceOrder.hasMany(Decision, {
      as: 'decisions',
      foreignKey: { name: 'order_id', allowNull: false },
    });
  }
}
