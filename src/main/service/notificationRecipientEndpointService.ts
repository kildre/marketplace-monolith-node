import GetVisibleNotificationRecipientsRequestDto from "../web/dtos/GetVisibleNotificationRecipientsRequestDto";
import NotificationRecipientDto from "../web/dtos/NotificationRecipientDto";
import marketplaceUserDao from "../rdbms/dao/marketplaceUserDao";
import notificationRecipientDao from "../rdbms/dao/notificationRecipientDao";
import { NotificationRecipient } from "../rdbms/entities/NotificationRecipient";
import { Notification } from "../rdbms/entities/Notification";
import MissingAssociationError from "../domain/errors/MissingAssociationError";
import NotificationDto from "../web/dtos/NotificationDto";


export interface NotificationRecipientEndpointServiceI {
  getVisible(request: GetVisibleNotificationRecipientsRequestDto): Promise<NotificationRecipientDto[]>;
}

class NotificationRecipientEndpointService implements NotificationRecipientEndpointServiceI {
  async getVisible(request: GetVisibleNotificationRecipientsRequestDto): Promise<NotificationRecipientDto[]> {
    const currentUserEmail = String(request.currentUserEmail)
      .trim()
      .toLowerCase();
    
    const currentUser = await marketplaceUserDao.findByEmail(currentUserEmail);
    if (!currentUser) {
      throw new Error(`User with email ${currentUserEmail} not found.`);
    }

    const notificationRecipients = await notificationRecipientDao.findVisibleByRecipient(currentUser.id);
    const dtos : NotificationRecipientDto[] = [];

    for (const nr of notificationRecipients) {
      dtos.push(this.notificationRecipientToDto(nr));
    }

    return dtos;
  }

  private notificationRecipientToDto(nr: NotificationRecipient): NotificationRecipientDto {
    if (!nr.notification) {
        throw new MissingAssociationError({
          associationName: 'notification',
          entityClassName: 'NotificationRecipient',
        });
    }

    return new NotificationRecipientDto({
      notification: this.notificationToDto(nr.notification),
      read: nr.read,
      createdAt: nr.createdAt.toISOString(),
      updatedAt: nr.updatedAt.toISOString(),
    });
  }

  private notificationToDto(n: Notification): NotificationDto {

    if (!n.priority) {
        throw new MissingAssociationError({
          associationName: 'priority',
          entityClassName: 'Notification',
        });
    }

    return new NotificationDto({
      id: n.id,
      title: n.title,
      message: n.message,
      priorityLevel: n.priority.level,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    });

  }

}

const notificationRecipientEndpointService = new NotificationRecipientEndpointService();
export default notificationRecipientEndpointService;