// src/rdbms/entities/OrderItem.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { MarketplaceOrder } from './MarketplaceOrder';
import { Product } from './Product';

export class OrderItem
  extends Model<InferAttributes<OrderItem>, InferCreationAttributes<OrderItem>> {

  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;

  // foreign keys (handy to access directly)
  declare orderId: number;    // maps to order_id
  declare productId: number;  // maps to product_id

  declare justification: string | null; 

  // associations (NonAttribute so Sequelize doesn't treat them as columns)
  declare order?: NonAttribute<MarketplaceOrder>;
  declare product?: NonAttribute<Product>;

  static initModel(sequelize: Sequelize) {
    OrderItem.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

        // FK columns
        orderId:   { type: DataTypes.INTEGER, allowNull: false, field: 'order_id' },
        productId: { type: DataTypes.INTEGER, allowNull: false, field: 'product_id' },
        justification:  { type: DataTypes.STRING, allowNull: true },
      },
      {
        sequelize,
        tableName: 'order_item',
        underscored: true,
        timestamps: false,
        indexes: [
          { fields: ['order_id'] },
          { fields: ['product_id'] },
        ],
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceOrder, Product } = sequelize.models as any;

    OrderItem.belongsTo(MarketplaceOrder, {
      foreignKey: { name: 'orderId', allowNull: false },
      as: 'order',
    });

    OrderItem.belongsTo(Product, {
      foreignKey: { name: 'productId', allowNull: false },
      as: 'product',
    });
  }
}
