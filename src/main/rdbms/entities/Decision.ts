import { DataTypes, Model, Sequelize } from 'sequelize';
import { MarketplaceUser } from './MarketplaceUser';
import { UseCaseRequest } from './UseCaseRequest';
import { MarketplaceOrder } from './MarketplaceOrder';
import { Status } from './Status';

export class Decision extends Model {
  public id!: number;
  public decisionNumber!: string;
  public ticketType!: string;
  public asset!: string;
  public quantity!: number;
  public estimatedPrice!: number;
  public comments!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public decisionAt!: Date;

  // association props
  public adjudicator?: MarketplaceUser;
  public request?: UseCaseRequest;
  public order?: MarketplaceOrder;
  public status?: Status;

  static initModel(sequelize: Sequelize) {
    Decision.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        decisionNumber: { unique: true, type: DataTypes.STRING(32), allowNull: false },
        ticketType: {unique: false, type: DataTypes.STRING(64), allowNull: true },
        asset: {unique: false, type: DataTypes.STRING(128), allowNull: true },
        quantity: { type: DataTypes.INTEGER, allowNull: true },
        estimatedPrice: { type: DataTypes.DECIMAL(18, 2), allowNull: true },
        comments: { unique: false, type: DataTypes.STRING(1024), allowNull: false },
      },
      { sequelize, tableName: 'decision', underscored: true, timestamps: false }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, UseCaseRequest, MarketplaceOrder, Status } = sequelize.models as any;

    Decision.belongsTo(MarketplaceUser,  { foreignKey: { name: 'adjudicator_id', allowNull: false }, as: 'adjudicator' });
    Decision.belongsTo(UseCaseRequest,   { foreignKey: { name: 'request_id', allowNull: false},     as: 'request' });
    Decision.belongsTo(MarketplaceOrder, { foreignKey: 'order_id',       as: 'order' });
    Decision.belongsTo(Status,           { foreignKey: {name: 'status_id', allowNull: false},      as: 'status' });
  }
}
