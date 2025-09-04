import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '../config/sequelizeConfig';
import { MarketplaceUser } from './MarketplaceUser';
import { Status } from './Status';

export class MarketplaceOrder extends Model<
  InferAttributes<MarketplaceOrder>,
  InferCreationAttributes<MarketplaceOrder>
> {
  declare id: CreationOptional<number>;
  declare requestor_id: ForeignKey<MarketplaceUser['id']> | null;
  declare status_id: ForeignKey<Status['id']> | null;
  declare created_at: Date;
  declare updated_at: Date; // not in DDL; we keep timestamps true so Sequelize manages updated_at
}

MarketplaceOrder.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    requestor_id: { type: DataTypes.INTEGER, allowNull: true },
    status_id: { type: DataTypes.SMALLINT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'marketplace_order', underscored: true, timestamps: true }
);
