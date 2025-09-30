// src/rdbms/entities/Decision.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { MarketplaceUser } from './MarketplaceUser';
import { UseCaseRequest } from './UseCaseRequest';
import { MarketplaceOrder } from './MarketplaceOrder';
import { Status } from './Status';

export class Decision
  extends Model<InferAttributes<Decision>, InferCreationAttributes<Decision>> {

  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;
  declare decisionNumber: string;
  declare ticketType: string | null;
  declare asset: string | null;
  declare quantity: number | null;
  declare estimatedPrice: string | number | null;
  declare comments: string;

  // foreign keys (handy to access directly)
  declare adjudicatorId: number;             // adjudicator_id
  declare requestId: number;                 // request_id
  declare orderId: number | null;            // order_id
  declare statusId: number;                  // status_id

  // associations (NonAttribute so Sequelize won’t treat as columns)
  declare adjudicator?: NonAttribute<MarketplaceUser>;
  declare request?: NonAttribute<UseCaseRequest>;
  declare order?: NonAttribute<MarketplaceOrder>;
  declare status?: NonAttribute<Status>;

  static initModel(sequelize: Sequelize) {
    Decision.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        decisionNumber: { type: DataTypes.STRING(32), allowNull: false, unique: true, field: 'decision_number' },
        ticketType: { type: DataTypes.STRING(64), allowNull: true, field: 'ticket_type' },
        asset: { type: DataTypes.STRING(128), allowNull: true },
        quantity: { type: DataTypes.INTEGER, allowNull: true },
        estimatedPrice: { type: DataTypes.DECIMAL(18, 2), allowNull: true, field: 'estimated_price' },
        comments: { type: DataTypes.STRING(1024), allowNull: false },

        // FKs
        adjudicatorId: { type: DataTypes.INTEGER, allowNull: false, field: 'adjudicator_id' },
        requestId: { type: DataTypes.INTEGER, allowNull: false, field: 'request_id' },
        orderId: { type: DataTypes.INTEGER, allowNull: true, field: 'order_id' },
        statusId: { type: DataTypes.INTEGER, allowNull: false, field: 'status_id' },
      },
      {
        sequelize,
        tableName: 'decision',
        underscored: true,
        timestamps: false, // set true only if you truly have created_at/updated_at managed by Sequelize
        indexes: [
          { unique: true, fields: ['decision_number'] },
          { fields: ['request_id'] },
          { fields: ['adjudicator_id'] },
          { fields: ['status_id'] },
        ],
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, UseCaseRequest, MarketplaceOrder, Status } = sequelize.models as any;

    Decision.belongsTo(MarketplaceUser, {
      foreignKey: { name: 'adjudicatorId', allowNull: false },
      as: 'adjudicator',
    });

    Decision.belongsTo(UseCaseRequest, {
      foreignKey: { name: 'requestId', allowNull: false },
      as: 'request',
    });

    Decision.belongsTo(MarketplaceOrder, {
      foreignKey: { name: 'orderId', allowNull: true },
      as: 'order',
    });

    Decision.belongsTo(Status, {
      foreignKey: { name: 'statusId', allowNull: false },
      as: 'status',
    });
  }
}
