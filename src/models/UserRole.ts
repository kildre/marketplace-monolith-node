import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../config/sequelizeConfig';

export class UserRole extends Model<
  InferAttributes<UserRole>,
  InferCreationAttributes<UserRole>
> {
  declare user_id: number;
  declare role_id: number;
}

UserRole.init(
  {
    user_id: { type: DataTypes.INTEGER, primaryKey: true },
    role_id: { type: DataTypes.SMALLINT, primaryKey: true }
  },
  { sequelize, tableName: 'user_roles', underscored: true, timestamps: false }
);
