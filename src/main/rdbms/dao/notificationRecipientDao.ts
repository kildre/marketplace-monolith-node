import { BaseDAO } from './BaseDAO';
import { NotificationRecipient } from '../entities/NotificationRecipient';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { Notification } from '../entities/Notification';
import { NotificationPriority } from '../entities/NotificationPriority';

class NotificationRecipientDao extends BaseDAO<NotificationRecipient> {
  constructor() {
    super(NotificationRecipient);
  }

  async findVisibleByRecipient(recipientId: number): Promise<NotificationRecipient[]> {
    return NotificationRecipient.findAll({
      where: { recipientId, hidden: false } as any,
      include: [
        {model: MarketplaceUser, as: 'recipient'},
        {model: Notification, as: 'notification', include: [{model: NotificationPriority, as: 'priority'}]},
    ],
      order: [['id', 'ASC']],
    });
  }
}

const notificationRecipientDao = new NotificationRecipientDao();

export default notificationRecipientDao; ;
