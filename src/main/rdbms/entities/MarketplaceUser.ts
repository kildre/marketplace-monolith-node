// src/rdbms/entities/MarketplaceUser.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';

export class MarketplaceUser
  extends Model<InferAttributes<MarketplaceUser>, InferCreationAttributes<MarketplaceUser>> {

  // columns (type-only; do NOT emit runtime class fields)
  declare id: CreationOptional<number>;
  declare email: string;

  // association props (NonAttribute so Sequelize doesn't treat them as columns)
  declare roles?: NonAttribute<any[]>;
  declare requests?: NonAttribute<any[]>;
  declare orders?: NonAttribute<any[]>;
  declare decisions?: NonAttribute<any[]>;

  static initModel(sequelize: Sequelize) {
    MarketplaceUser.init(
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        email: {
          type: DataTypes.STRING(128),
          allowNull: false,
          unique: true,
        },
      },
      {
        sequelize,
        tableName: 'marketplace_user',
        underscored: true,
        timestamps: false, // your table has no created_at/updated_at
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { Role, UserRole, UseCaseRequest, MarketplaceOrder, Decision } = sequelize.models as any;

    MarketplaceUser.belongsToMany(Role, {
      through: UserRole,              
      foreignKey: 'userId',
      otherKey: 'roleId',
      as: 'roles',
    });

    MarketplaceUser.hasMany(UseCaseRequest, {
      foreignKey: 'requestorId',
      as: 'requests',
    });

    MarketplaceUser.hasMany(MarketplaceOrder, {
      foreignKey: 'requestorId',
      as: 'orders',
    });

    MarketplaceUser.hasMany(Decision, {
      foreignKey: 'adjudicatorId',
      as: 'decisions',
    });
  }
}
