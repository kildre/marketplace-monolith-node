import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../config/sequelizeConfig';

export class Role extends Model<
  InferAttributes<Role>,
  InferCreationAttributes<Role>
> {
  declare id: number; // SMALLINT
  declare code: string;
}

Role.init(
  {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    code: { type: DataTypes.STRING(16), allowNull: false, unique: true }
  },
  { sequelize, tableName: 'role', underscored: true, timestamps: false }
);
