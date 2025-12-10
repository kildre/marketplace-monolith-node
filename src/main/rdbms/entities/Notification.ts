
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from "sequelize";
import { NotificationPriority } from "./NotificationPriority";

export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;
  declare title: string;
  declare message: string;
  declare notificationPriorityId: number;

  // timestamp columns added by Sequelize when `timestamps: true` is enabled
  // Declaring them here makes them readable/typed on the model instances.
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // associations (NonAttribute so Sequelize won’t treat them as columns)
  declare priority?: NonAttribute<NotificationPriority>;

  static initModel(sequelize: Sequelize) {
    Notification.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        title: { type: DataTypes.STRING(128), allowNull: false },
        message: { type: DataTypes.STRING(2048), allowNull: false },
        notificationPriorityId: { type: DataTypes.SMALLINT, allowNull: false, field: "notification_priority_id" },
        createdAt: { type: DataTypes.DATE, allowNull: false, field: "created_at" },
        updatedAt: { type: DataTypes.DATE, allowNull: false, field: "updated_at" },
      },
      {
        sequelize,
        tableName: "notification",
        underscored: true,
        // This adds the properties at runtime, but we still need to declare them above for TypeScript.
        timestamps: true, // expects created_at / updated_at in DB
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { NotificationPriority } =
      sequelize.models as any;

    Notification.belongsTo(NotificationPriority, {
      foreignKey: { name: "notificationPriorityId", allowNull: false },
      as: "priority",
    });
  }
}
