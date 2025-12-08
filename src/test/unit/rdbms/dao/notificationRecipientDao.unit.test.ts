jest.mock('../../../../main/rdbms/entities/NotificationRecipient', () => {
  class NotificationRecipient {
    static findAll = jest.fn();
  }
  return { NotificationRecipient };
});

jest.mock('../../../../main/rdbms/entities/MarketplaceUser', () => {
  class MarketplaceUser {}
  return { MarketplaceUser };
});

jest.mock('../../../../main/rdbms/entities/NotificationPriority', () => {
  class NotificationPriority {}
  return { NotificationPriority };
});

jest.mock('../../../../main/rdbms/entities/Notification', () => {
  class Notification {}
  return { Notification };
});

import { MarketplaceUser } from '../../../../main/rdbms/entities/MarketplaceUser';
import { NotificationPriority } from '../../../../main/rdbms/entities/NotificationPriority';
import { Notification } from '../../../../main/rdbms/entities/Notification';
import notificationRecipientDao from '../../../../main/rdbms/dao/notificationRecipientDao';
import { NotificationRecipient } from '../../../../main/rdbms/entities/NotificationRecipient';

describe('NotificationRecipientDAO', () => {
  const dao = notificationRecipientDao;

  beforeEach(() => {
    (NotificationRecipient.findAll as any).mockReset?.();
  });

  test('findVisibleByRecipient includes recipient and notification with priority, filters for hidden = false, and sorts', async () => {
    (NotificationRecipient.findAll as any).mockResolvedValue([{ recipientId: 1, notificationId: 1 }, { recipientId: 1, notificationId: 2 }]);
    const items = await dao.findVisibleByRecipient(1);
    expect(NotificationRecipient.findAll).toHaveBeenCalledWith({
      where: { recipientId: 1, hidden: false } as any,
      include: [
        {model: MarketplaceUser, as: 'recipient'},
        {model: Notification, as: 'notification', include: [{model: NotificationPriority, as: 'priority'}]},
      ],
      order: [['notification_id', 'ASC']],
    });
    expect(items).toHaveLength(2);
  });

});
