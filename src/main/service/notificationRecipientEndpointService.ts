import GetVisibleNotificationRecipientsRequestDto from "../web/dtos/GetVisibleNotificationRecipientsRequestDto";
import NotificationRecipientDto from "../web/dtos/NotificationRecipientDto";


export interface NotificationRecipientServiceI {
  getVisible(request: GetVisibleNotificationRecipientsRequestDto): Promise<NotificationRecipientDto[]>;
}

class NotificationRecipientEndpointService implements NotificationRecipientServiceI {
  async getVisible(request: GetVisibleNotificationRecipientsRequestDto): Promise<NotificationRecipientDto[]> {
    // --- IGNORE ---
    return [];
  }
}

const notificationRecipientEndpointService = new NotificationRecipientEndpointService();
export default notificationRecipientEndpointService;