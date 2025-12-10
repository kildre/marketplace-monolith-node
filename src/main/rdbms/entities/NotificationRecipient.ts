
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
    declare read: boolean;
    declare hidden: boolean;

    // foreign keys (optional but handy for typing)
    declare recipientId: number; // maps to recipient_id
    declare notificationId: number; // maps to notification_id

    // timestamp columns added by Sequelize when `timestamps: true` is enabled
    // Declaring them here makes them readable/typed on the model instances.
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    // associations (NonAttribute so Sequelize doesn't treat them as columns)
    declare recipient?: NonAttribute<MarketplaceUser>;
    declare notification?: NonAttribute<Notification>;

    static initModel(sequelize: Sequelize) {
        NotificationRecipient.init(
            {
                read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
                hidden: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

                // FK columns (add these so you can read/write them directly)
                recipientId: { type: DataTypes.INTEGER, allowNull: false, field: 'recipient_id', primaryKey: true },
                notificationId: { type: DataTypes.INTEGER, allowNull: false, field: 'notification_id', primaryKey: true },
                createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
                updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
            },
            {
                sequelize,
                tableName: 'notification_recipient',
                underscored: true,
                // This adds the properties at runtime, but we still need to declare them above for TypeScript.
                timestamps: true,
            }
        );

        // Ensure Sequelize does not add/use a default `id` PK column for this model
        NotificationRecipient.removeAttribute('id');
    }

    static associate(sequelize: Sequelize) {
        const { MarketplaceUser, Notification } = sequelize.models as any;

        NotificationRecipient.belongsTo(MarketplaceUser, {
            foreignKey: 'recipientId',
            as: 'recipient',
        });

        NotificationRecipient.belongsTo(Notification, {
            foreignKey: 'notificationId',
            as: 'notification',
        });
    }
}
