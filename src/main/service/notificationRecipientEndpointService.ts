import GetVisibleNotificationRecipientsRequestDto from "../web/dtos/GetVisibleNotificationRecipientsRequestDto";
import NotificationRecipientDto from "../web/dtos/NotificationRecipientDto";
import marketplaceUserDao from "../rdbms/dao/marketplaceUserDao";
import notificationRecipientDao from "../rdbms/dao/notificationRecipientDao";
import { NotificationRecipient } from "../rdbms/entities/NotificationRecipient";


export interface NotificationRecipientServiceI {
  getVisible(request: GetVisibleNotificationRecipientsRequestDto): Promise<NotificationRecipientDto[]>;
}

class NotificationRecipientEndpointService implements NotificationRecipientServiceI {
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
  
    }

    return dtos;
  }

  private notificationRecipientToDto(nr: NotificationRecipient): NotificationRecipientDto {
    return new NotificationRecipientDto({
      id: nr.id,
      title: nr.title,
      message: nr.message,
      read: nr.read,
        priorityLevel: nr.notification?.priority?.level,
        createdAt: nr.createdAt.toISOString(),
        updatedAt: nr.updatedAt.toISOString(),
    });
  }

}

const notificationRecipientEndpointService = new NotificationRecipientEndpointService();
export default notificationRecipientEndpointService;