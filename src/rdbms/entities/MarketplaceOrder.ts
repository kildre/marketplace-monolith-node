import { DataTypes, Model, Sequelize } from 'sequelize';

export class MarketplaceOrder extends Model {
  public id!: number;

  static initModel(sequelize: Sequelize) {
    MarketplaceOrder.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      },
      { sequelize, tableName: 'marketplace_order', underscored: true }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, Status, OrderItem, Decision } = sequelize.models as any;

    MarketplaceOrder.belongsTo(MarketplaceUser, { foreignKey: 'requestor_id', as: 'requestor' });
    MarketplaceOrder.belongsTo(Status,          { foreignKey: 'status_id',    as: 'status' });
    MarketplaceOrder.hasMany(OrderItem,         { foreignKey: 'order_id',     as: 'items'  });
    MarketplaceOrder.hasMany(Decision,          { foreignKey: 'order_id',     as: 'decisions' });
  }
}
