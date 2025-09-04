import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from 'sequelize';
import { sequelize } from '../config/sequelizeConfig';
import { MarketplaceUser } from './MarketplaceUser';
import { Status } from './Status';

export class UseCaseRequest extends Model<
  InferAttributes<UseCaseRequest>,
  InferCreationAttributes<UseCaseRequest>
> {
  declare id: CreationOptional<number>;
  declare request_number: string;
  declare requestor_id: ForeignKey<MarketplaceUser['id']>;
  declare designation: string | null;
  declare agency: string | null;
  declare organization: string | null;
  declare other_organization: string | null;
  declare point_of_contact: string | null;
  declare phone_number: string | null;
  declare email: string | null;
  declare estimated_rom: string | null;
  declare requested_tool_name: string;
  declare description: string;
  declare status_id: ForeignKey<Status['id']>;
  declare created_at: Date;
  declare updated_at: Date;
}

UseCaseRequest.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    request_number: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    requestor_id: { type: DataTypes.INTEGER, allowNull: false },
    designation: { type: DataTypes.STRING(128) },
    agency: { type: DataTypes.STRING(128) },
    organization: { type: DataTypes.STRING(128) },
    other_organization: { type: DataTypes.STRING(128) },
    point_of_contact: { type: DataTypes.STRING(128) },
    phone_number: { type: DataTypes.STRING(32) },
    email: { type: DataTypes.STRING(128) },
    estimated_rom: { type: DataTypes.STRING(32) },
    requested_tool_name: { type: DataTypes.STRING(128), allowNull: false },
    description: { type: DataTypes.STRING(1024), allowNull: false },
    status_id: { type: DataTypes.SMALLINT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'use_case_request', underscored: true, timestamps: true }
);
