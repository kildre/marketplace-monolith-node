import { DataTypes, Model, Sequelize } from 'sequelize';

export class Product extends Model {
  public id!: number;
  public name!: string;

  static initModel(sequelize: Sequelize) {
    Product.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: {unique: true, type: DataTypes.STRING(128), allowNull: false },
      },
      { sequelize, tableName: 'product', underscored: true }
    );
  }

  static associate(sequelize: Sequelize) {
    const { OrderItem } = sequelize.models as any;
    Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
  }
}
