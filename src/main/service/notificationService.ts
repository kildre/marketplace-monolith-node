
import { Notification} from "../rdbms/entities/Notification";
import { NotificationRecipient } from "../rdbms/entities/NotificationRecipient";
import { Transaction } from "sequelize";
import { NotificationPriorityEnum } from "../domain/enumeration/NotificationPriorityEnum";

interface SendNotificationProps {
    recipientIds: number[];
    title: string;
    message: string;
    priority: NotificationPriorityEnum;
    tx: Transaction;
}

export interface NotificationServiceI {
  send(props: SendNotificationProps): Promise<Notification>;
}

class NotificationService implements NotificationServiceI {
    async send(props: SendNotificationProps): Promise<Notification> {
        const notification = await Notification.create({
            title: props.title,
            message: props.message,
            notificationPriorityId: props.priority.id,
        }, { transaction: props.tx });

        for (const requestorId of props.recipientIds) {
            await NotificationRecipient.create({
                recipientId: requestorId,
                notificationId: notification.dataValues.id,
                read: false,
                hidden: false,
            }, { transaction: props.tx });
        }

        return notification;
    }
}

export const notificationService = new NotificationService();
