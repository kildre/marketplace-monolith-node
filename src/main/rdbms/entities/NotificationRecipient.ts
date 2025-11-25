// src/rdbms/entities/CartItem.ts
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
import { Notification } from './Notification';

export class NotificationRecipient
    extends Model<InferAttributes<NotificationRecipient>, InferCreationAttributes<NotificationRecipient>> {

    // columns (type-only; not emitted at runtime)
    declare id: CreationOptional<number>;
    declare read: boolean;
    declare hidden: boolean;

    // foreign keys (optional but handy for typing)
    declare recipientId: number; // maps to recipient_id
    declare notificationId: number; // maps to notification_id

    // associations (NonAttribute so Sequelize doesn't treat them as columns)
    declare recipient?: NonAttribute<MarketplaceUser>;
    declare notification?: NonAttribute<Notification>;

    static initModel(sequelize: Sequelize) {
        NotificationRecipient.init(
            {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
                hidden: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

                // FK columns (add these so you can read/write them directly)
                recipientId: { type: DataTypes.INTEGER, allowNull: false, field: 'recipient_id' },
                notificationId: { type: DataTypes.INTEGER, allowNull: false, field: 'notification_id' },
            },
            {
                sequelize,
                tableName: 'notification_recipient',
                underscored: true,
                timestamps: true,
            }
        );
    }

    static associate(sequelize: Sequelize) {
        const { MarketplaceUser, Notification } = sequelize.models as any;

        NotificationRecipient.belongsTo(MarketplaceUser, {
            foreignKey: 'recipientId',
            as: 'recipient',
        });

        NotificationRecipient.belongsTo(Notification, {
            foreignKey: 'NotificationId',
            as: 'notification',
        });
    }
}
