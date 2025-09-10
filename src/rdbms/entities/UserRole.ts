import { DataTypes, Model, Sequelize } from 'sequelize';

export class UserRole extends Model {
  static initModel(sequelize: Sequelize) {
    UserRole.init(
      {
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        role_id: { type: DataTypes.INTEGER, allowNull: false },
      },
      { sequelize, tableName: 'user_role', underscored: true, timestamps: false }
    );
  }
  // no associate needed; used via through
}
