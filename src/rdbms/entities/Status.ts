import { DataTypes, Model, Sequelize } from 'sequelize';

export class Status extends Model {
  public id!: number;
  public code!: string;

  static initModel(sequelize: Sequelize) {
    Status.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      },
      { sequelize, tableName: 'status', underscored: true }
    );
  }

  static associate(sequelize: Sequelize) {
    const { UseCaseRequest, MarketplaceOrder, Decision } = sequelize.models as any;
    Status.hasMany(UseCaseRequest,   { foreignKey: 'status_id', as: 'requests' });
    Status.hasMany(MarketplaceOrder, { foreignKey: 'status_id', as: 'orders' });
    Status.hasMany(Decision,         { foreignKey: 'status_id', as: 'decisions' });
  }
}
