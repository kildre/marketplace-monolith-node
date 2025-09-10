import { DataTypes, Model, Sequelize } from 'sequelize';

export class Role extends Model {
  public id!: number;
  public name!: string;

  static initModel(sequelize: Sequelize) {
    Role.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      },
      { sequelize, tableName: 'role', underscored: true }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser, UserRole } = sequelize.models as any;

    Role.belongsToMany(MarketplaceUser, {
      through: UserRole, foreignKey: 'role_id', otherKey: 'user_id', as: 'users'
    });
  }
}
