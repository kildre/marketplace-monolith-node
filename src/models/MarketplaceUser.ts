import {
  DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional
} from 'sequelize';
import { sequelize } from '../config/sequelizeConfig';

export class MarketplaceUser extends Model<
  InferAttributes<MarketplaceUser>,
  InferCreationAttributes<MarketplaceUser>
> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare advana_user_id: string | null;
  declare first_name: string | null;
  declare last_name: string | null;
  declare agency: string | null;
  declare designation: string | null;
}

MarketplaceUser.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    advana_user_id: { type: DataTypes.STRING(128), allowNull: true, unique: true },
    first_name: { type: DataTypes.STRING(64), allowNull: true },
    last_name: { type: DataTypes.STRING(64), allowNull: true },
    agency: { type: DataTypes.STRING(128), allowNull: true },
    designation: { type: DataTypes.STRING(128), allowNull: true },
  },
  { sequelize, tableName: 'marketplace_user', underscored: true, timestamps: false }
);
