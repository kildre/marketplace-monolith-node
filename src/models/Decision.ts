import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '../config/sequelizeConfig';
import { MarketplaceUser } from './MarketplaceUser';
import { UseCaseRequest } from './UseCaseRequest';
import { MarketplaceOrder } from './MarketplaceOrder';
import { Status } from './Status';

export class Decision extends Model<
  InferAttributes<Decision>,
  InferCreationAttributes<Decision>
> {
  declare id: CreationOptional<number>;
  declare decision_number: string;
  declare adjudicator_id: ForeignKey<MarketplaceUser['id']>;
  declare request_id: ForeignKey<UseCaseRequest['id']>;
  declare order_id: ForeignKey<MarketplaceOrder['id']> | null;
  declare status_id: ForeignKey<Status['id']>;
  declare ticket_type: string | null;
  declare asset: string | null;
  declare quantity: number | null;
  declare estimated_price: string | null; // DECIMAL(18,2) — prefer string
  declare comments: string;
  declare created_at: Date;
  declare updated_at: Date;
  declare decision_at: Date;
}

Decision.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    decision_number: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    adjudicator_id: { type: DataTypes.INTEGER, allowNull: false },
    request_id: { type: DataTypes.INTEGER, allowNull: false },
    order_id: { type: DataTypes.INTEGER, allowNull: true },
    status_id: { type: DataTypes.SMALLINT, allowNull: false },
    ticket_type: { type: DataTypes.STRING(64) },
    asset: { type: DataTypes.STRING(128) },
    quantity: { type: DataTypes.INTEGER },
    estimated_price: { type: DataTypes.DECIMAL(18, 2) as any }, // TS treat as string in code
    comments: { type: DataTypes.STRING(1024), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    decision_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'decision', underscored: true, timestamps: true }
);
