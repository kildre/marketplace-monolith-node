import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '../config/sequelizeConfig';
import { MarketplaceOrder } from './MarketplaceOrder';
import { Product } from './Product';

export class OrderItem extends Model<
  InferAttributes<OrderItem>,
  InferCreationAttributes<OrderItem>
> {
  declare id: CreationOptional<number>;
  declare order_id: ForeignKey<MarketplaceOrder['id']>;
  declare product_id: ForeignKey<Product['id']>;
  declare justification: string;
}

OrderItem.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    justification: { type: DataTypes.STRING(1024), allowNull: false }
  },
  { sequelize, tableName: 'order_item', underscored: true, timestamps: false }
);
