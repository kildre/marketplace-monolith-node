
import {
  DataTypes,
  Model,
  Sequelize,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  NonAttribute,
} from 'sequelize';
import { Notification } from './Notification';

export class NotificationPriority
  extends Model<InferAttributes<NotificationPriority>, InferCreationAttributes<NotificationPriority>> {

  // columns (type-only; not emitted at runtime)
  declare id: CreationOptional<number>;
  declare code: string;
  declare level: number;

  // associations (mark as NonAttribute so Sequelize doesn't treat them as columns)
  declare notifications?: NonAttribute<Notification[]>;

  static initModel(sequelize: Sequelize) {
    NotificationPriority.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        code: { type: DataTypes.STRING(16), allowNull: false, unique: true },
        level: { type: DataTypes.INTEGER, allowNull: false },
      },
      {
        sequelize,
        tableName: 'notification_priority',
        underscored: true,
        timestamps: false,
        indexes: [
          { unique: true, fields: ['code'] },
        ],
      }
    );
  }

  static associate(sequelize: Sequelize) {
    const { Notification } = sequelize.models as any;

    NotificationPriority.hasMany(Notification, {
      foreignKey: { name: 'notificationPriorityId', allowNull: false },
      as: 'notifications',
    });
  }
}
