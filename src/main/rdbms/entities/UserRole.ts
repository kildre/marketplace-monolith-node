// src/rdbms/entities/UserRole.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';

export class UserRole
  extends Model<InferAttributes<UserRole>, InferCreationAttributes<UserRole>> {

  // type-only attribute declarations (no runtime fields)
  declare userId: number; // maps to user_id
  declare roleId: number; // maps to role_id

  static initModel(sequelize: Sequelize) {
    UserRole.init(
      {
        // Composite PK so Sequelize won't add an 'id' column
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'user_id',
          primaryKey: true,
        },
        roleId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'role_id',
          primaryKey: true,
        },
      },
      {
        sequelize,
        tableName: 'user_roles',   
        underscored: true,
        timestamps: false,
        indexes: [
          // Ensures uniqueness and helps lookups
          { unique: true, fields: ['user_id', 'role_id'] },
          { fields: ['user_id'] },
          { fields: ['role_id'] },
        ],
      }
    );
  }
}
