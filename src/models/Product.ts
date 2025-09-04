import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../config/sequelizeConfig';

export class Product extends Model<
  InferAttributes<Product>,
  InferCreationAttributes<Product>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare vendor: string | null;
  declare description: string | null;
}

Product.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    vendor: { type: DataTypes.STRING(128), allowNull: true },
    description: { type: DataTypes.STRING(1024), allowNull: true },
  },
  { sequelize, tableName: 'product', underscored: true, timestamps: false }
);
