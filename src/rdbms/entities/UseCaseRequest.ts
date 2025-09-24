import { DataTypes, Model, Sequelize } from 'sequelize';
import { Status } from './Status';
import { MarketplaceUser } from './MarketplaceUser';
import { Decision } from './Decision';
import { CartItem } from './CartItem';

export class UseCaseRequest extends Model {
  public id!: number;
  public requestNumber!: string;
  public designation!: string;
  public agency!: string;
  public organization!: string;
  public pointOfContact!: string;
  public requestedToolName!: string;
  public phoneNumber!: string;
  public estimatedRom!: string;
  public description!: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // association props
  public requestor?: MarketplaceUser;
  public status?: Status;
  public decisions?: Decision[];
  public cartItems?: CartItem[];

  static initModel(sequelize: Sequelize) {
    UseCaseRequest.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        requestNumber: { unique: true, type: DataTypes.STRING(32), allowNull: false },
        designation: {unique: false, type: DataTypes.STRING(128), allowNull: true },
        agency: {unique: false, type: DataTypes.STRING(128), allowNull: true },
        organization: {unique: false, type: DataTypes.STRING(128), allowNull: true },
        pointOfContact: {unique: false, type: DataTypes.STRING(128), allowNull: true },
        requestedToolName: {unique: false, type: DataTypes.STRING(128), allowNull: false },
        phoneNumber: { unique: false, type: DataTypes.STRING(32), allowNull: true },
        estimatedRom: { unique: false, type: DataTypes.STRING(32), allowNull: true },
        description: { unique: false, type: DataTypes.STRING(1024), allowNull: false },
        createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
        updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },        
      },
      { sequelize, tableName: 'use_case_request', underscored: true, timestamps: true }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, Status, Decision } = sequelize.models as any;

    UseCaseRequest.belongsTo(MarketplaceUser, { foreignKey: { name: 'requestor_id', allowNull: false }, as: 'requestor' });
    UseCaseRequest.belongsTo(Status,          { foreignKey: { name: 'status_id', allowNull: false },    as: 'status' });
    UseCaseRequest.hasMany(Decision,          { foreignKey: 'request_id',   as: 'decisions' });
    UseCaseRequest.hasMany(CartItem,          { foreignKey: 'request_id',   as: 'cartItems' });
  }
}
