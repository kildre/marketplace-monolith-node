// src/rdbms/entities/UseCaseRequest.ts
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "sequelize";
import { Status } from "./Status";
import { MarketplaceUser } from "./MarketplaceUser";
import { Decision } from "./Decision";
import { CartItem } from "./CartItem";
import { NotificationPriority } from "./NotificationPriority";

export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;
  declare title: string;
  declare message: string;

  // associations (NonAttribute so Sequelize won’t treat them as columns)
  declare notificationPriority?: NonAttribute<NotificationPriority>;
//   declare status?: NonAttribute<Status>;
//   declare decisions?: NonAttribute<Decision[]>;
//   declare cartItems?: NonAttribute<CartItem[]>;

  static initModel(sequelize: Sequelize) {
    Notification.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        title: { type: DataTypes.STRING(128), allowNull: false },
        message: { type: DataTypes.STRING(2048), allowNull: false },
        // Do NOT redeclare createdAt/updatedAt unless you really need to.
        // With timestamps: true + underscored: true, Sequelize uses created_at / updated_at automatically.
      },
      {
        sequelize,
        tableName: "notification",
        underscored: true,
        timestamps: true, // expects created_at / updated_at in DB
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { NotificationPriority } =
      sequelize.models as any;

    // UseCaseRequest.belongsTo(MarketplaceUser, {
    //   foreignKey: { name: "requestorId", allowNull: false },
    //   as: "requestor",
    // });

    Notification.belongsTo(NotificationPriority, {
      foreignKey: { name: "notificationPriorityId", allowNull: false },
      as: "notificationPriority",
    });

    // UseCaseRequest.hasMany(Decision, {
    //   foreignKey: "requestId",
    //   as: "decisions",
    // });

    // UseCaseRequest.hasMany(CartItem, {
    //   foreignKey: "requestId",
    //   as: "cartItems",
    // });
  }
}
