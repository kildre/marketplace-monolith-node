
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

  // associations (NonAttribute so Sequelize won’t treat them as columns)
  declare notificationPriority?: NonAttribute<NotificationPriority>;

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

    Notification.belongsTo(NotificationPriority, {
      foreignKey: { name: "notificationPriorityId", allowNull: false },
      as: "notificationPriority",
    });
  }
}
