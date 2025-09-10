import { DataTypes, Model, Sequelize } from 'sequelize';

export class MarketplaceUser extends Model {
  public id!: number;
  public email!: string;

  static initModel(sequelize: Sequelize) {
    MarketplaceUser.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        email: { type: DataTypes.STRING(128), allowNull: false, unique: true },
      },
      { sequelize, tableName: 'marketplace_user', underscored: true }
    );
  }

  static associate(sequelize: Sequelize) {
    const { Role, UserRole, UseCaseRequest, MarketplaceOrder, Decision } = sequelize.models as any;

    MarketplaceUser.belongsToMany(Role, {
      through: UserRole, foreignKey: 'user_id', otherKey: 'role_id', as: 'roles'
    });

    MarketplaceUser.hasMany(UseCaseRequest, { foreignKey: 'requestor_id', as: 'requests' });
    MarketplaceUser.hasMany(MarketplaceOrder, { foreignKey: 'requestor_id', as: 'orders' });
    MarketplaceUser.hasMany(Decision, { foreignKey: 'adjudicator_id', as: 'decisions' });
  }
}
