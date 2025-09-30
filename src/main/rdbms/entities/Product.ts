// src/rdbms/entities/Product.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { OrderItem } from './OrderItem';

export class Product
  extends Model<InferAttributes<Product>, InferCreationAttributes<Product>> {

  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;
  declare name: string;

  // associations (NonAttribute so Sequelize won't treat them as columns)
  declare orderItems?: NonAttribute<OrderItem[]>;

  static initModel(sequelize: Sequelize) {
    Product.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(128), allowNull: false, unique: true },
      },
      {
        sequelize,
        tableName: 'product',
        underscored: true,
        timestamps: false, 
        indexes: [
          { unique: true, fields: ['name'] },
        ],
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { OrderItem } = sequelize.models as any;
    Product.hasMany(OrderItem, {
      foreignKey: { name: 'productId', allowNull: false },
      as: 'orderItems',
    });
  }
}
