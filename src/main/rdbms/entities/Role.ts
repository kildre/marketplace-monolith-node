// src/rdbms/entities/Role.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { MarketplaceUser } from './MarketplaceUser';
import { UserRole } from './UserRole';

export class Role
  extends Model<InferAttributes<Role>, InferCreationAttributes<Role>> {

  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;
  declare name: string;

  // associations
  declare users?: NonAttribute<MarketplaceUser[]>;

  static initModel(sequelize: Sequelize) {
    Role.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      },
      {
        sequelize,
        tableName: 'role',
        underscored: true,
        timestamps: false,
        indexes: [
          { unique: true, fields: ['name'] },
        ],
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { MarketplaceUser } = sequelize.models as any;

    Role.belongsToMany(MarketplaceUser, {
      through: UserRole,          
      foreignKey: 'roleId',
      otherKey: 'userId',
      as: 'users',
    });
  }
}
