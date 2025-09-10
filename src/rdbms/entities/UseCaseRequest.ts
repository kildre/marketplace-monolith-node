import { DataTypes, Model, Sequelize } from 'sequelize';

export class UseCaseRequest extends Model {
  public id!: number;

  static initModel(sequelize: Sequelize) {
    UseCaseRequest.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      },
      { sequelize, tableName: 'use_case_request', underscored: true }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, Status, Decision } = sequelize.models as any;

    UseCaseRequest.belongsTo(MarketplaceUser, { foreignKey: 'requestor_id', as: 'requestor' });
    UseCaseRequest.belongsTo(Status,          { foreignKey: 'status_id',    as: 'status' });
    UseCaseRequest.hasMany(Decision,          { foreignKey: 'request_id',   as: 'decisions' });
  }
}
