import { DataTypes, Model, Sequelize } from 'sequelize';

export class Decision extends Model {
  public id!: number;

  static initModel(sequelize: Sequelize) {
    Decision.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      },
      { sequelize, tableName: 'decision', underscored: true }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, UseCaseRequest, MarketplaceOrder, Status } = sequelize.models as any;

    Decision.belongsTo(MarketplaceUser,  { foreignKey: 'adjudicator_id', as: 'adjudicator' });
    Decision.belongsTo(UseCaseRequest,   { foreignKey: 'request_id',     as: 'request' });
    Decision.belongsTo(MarketplaceOrder, { foreignKey: 'order_id',       as: 'order' });
    Decision.belongsTo(Status,           { foreignKey: 'status_id',      as: 'status' });
  }
}
