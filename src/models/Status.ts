import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { sequelize } from '../config/sequelizeConfig';

export class Status extends Model<
  InferAttributes<Status>,
  InferCreationAttributes<Status>
> {
  declare id: number;        // SMALLINT
  declare code: string;
}

Status.init(
  {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    code: { type: DataTypes.STRING(16), allowNull: false, unique: true }
  },
  { sequelize, tableName: 'status', underscored: true, timestamps: false }
);
