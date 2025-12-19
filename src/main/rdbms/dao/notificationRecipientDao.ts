import { BaseDao } from './BaseDao';
import { NotificationRecipient } from '../entities/NotificationRecipient';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { Notification } from '../entities/Notification';
import { NotificationPriority } from '../entities/NotificationPriority';

export interface NotificationRecipientDaoI extends BaseDao<NotificationRecipient> {
  findVisibleByRecipient(recipientId: number): Promise<NotificationRecipient[]>;
}

class NotificationRecipientDao extends BaseDao<NotificationRecipient> implements NotificationRecipientDaoI {
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
      order: [['notification_id', 'ASC']],
    });
  }
}

const notificationRecipientDao: NotificationRecipientDaoI = new NotificationRecipientDao();

export default notificationRecipientDao; ;
