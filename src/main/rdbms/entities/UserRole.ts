import { DataTypes, Model, Sequelize } from 'sequelize';

export class UserRole extends Model {
  // If you want typings:
  // declare userId: number;
  // declare roleId: number;

  static initModel(sequelize: Sequelize) {
    UserRole.init(
      {
        // use camelCase attributes...
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'user_id',     // ...mapped to snake_case column
        },
        roleId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'role_id',
        },
      },
      {
        sequelize,
        tableName: 'user_roles',
        underscored: true,
        timestamps: false,
        // Optional: add a composite unique index to prevent duplicates
        // indexes: [{ unique: true, fields: ['user_id', 'role_id'] }],
      }
    );
  }
}
