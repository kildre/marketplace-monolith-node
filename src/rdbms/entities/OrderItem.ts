import { DataTypes, Model, Sequelize } from 'sequelize';

export class OrderItem extends Model {
  public id!: number;

  static initModel(sequelize: Sequelize) {
    OrderItem.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      },
      { sequelize, tableName: 'order_item', underscored: true }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceOrder, Product } = sequelize.models as any;

    OrderItem.belongsTo(MarketplaceOrder, { foreignKey: 'order_id',   as: 'order' });
    OrderItem.belongsTo(Product,          { foreignKey: 'product_id', as: 'product' });
  }
}
