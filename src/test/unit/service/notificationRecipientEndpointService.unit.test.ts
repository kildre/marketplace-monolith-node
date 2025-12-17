import { read } from "fs";
import { NotificationRecipientDaoI } from "src/main/rdbms/dao/notificationRecipientDao";
import { NotificationRecipient } from "src/main/rdbms/entities";
import { NotificationRecipientEndpointServiceI } from "src/main/service/notificationRecipientEndpointService";
import GetVisibleNotificationRecipientsRequestDto from "src/main/web/dtos/GetVisibleNotificationRecipientsRequestDto";
import NotificationRecipientDto from "src/main/web/dtos/NotificationRecipientDto";
import EmailCheckRequestDto from "src/main/web/dtos/RoleCheckRequestDto";


// ---- Module under test (imported AFTER mocks are set)
const SERVICE_PATH = '../../../main/service/notificationRecipientEndpointService';

// ---- Mocks for collaborators
// const mockUserSvc = {
//     isAuthorizedRequestor: jest.fn(),
//     isAuthorizedAdjudicator: jest.fn(),
//     findByEmail: jest.fn(),
//     findIdByEmail: jest.fn()
// }

const notificationRecipientDaoMock = {
    findVisibleByRecipient: jest.fn(),
}

const marketplaceUserDaoMock = {
    findByEmail: jest.fn(),
};

// ---- Mock the userEndpointService module the service imports
// jest.mock('../../../main/service/userEndpointService', () => ({
//   __esModule: true,
//   default: mockUserSvc,
// }));

jest.mock('../../../main/rdbms/dao/notificationRecipientDao', () => ({
  __esModule: true,
  default: notificationRecipientDaoMock,
}));

jest.mock('../../../main/rdbms/dao/marketplaceUserDao', () => ({
    __esModule: true,
    default: marketplaceUserDaoMock,
}));

describe('NotificationRecipientEndpointService', () => {
  let svc: NotificationRecipientEndpointServiceI;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Don't reset modules - this breaks instanceof checks for Sequelize errors
    const mod = await import(SERVICE_PATH);
    svc = mod.default;
  });

  it('should return a list of notification recipients', async () => {
    marketplaceUserDaoMock.findByEmail.mockResolvedValueOnce({ id: 1, email: 'judge@example.com' });
    const now = new Date();
    const nowIsoString = now.toISOString();

    const firstExpectedNotificationRecipientDto = new NotificationRecipientDto({
        notification: {
            id: 1,
            title: 'Notification 1',
            message: 'This is the first Notification',
            priorityLevel: 3,
            createdAt: nowIsoString,
            updatedAt: nowIsoString
        },
        read: false,
        createdAt: nowIsoString,
        updatedAt: nowIsoString,
    });

    const aecondExpectedNotificationRecipientDto = new NotificationRecipientDto({
        notification: {
            id: 2,
            title: 'Notification 2',
            message: 'This is the second Notification',
            priorityLevel: 3,
            createdAt: nowIsoString, 
            updatedAt: nowIsoString
        },
        read: false,
        createdAt: nowIsoString,
        updatedAt: nowIsoString,
    });

    const firstNotificationRecipient = {
        read: firstExpectedNotificationRecipientDto.read,
        createdAt: now,
        updatedAt: now,
        notification: {
            id: firstExpectedNotificationRecipientDto.notification.id,
            title: firstExpectedNotificationRecipientDto.notification.title,
            message: firstExpectedNotificationRecipientDto.notification.message,
            priority: {level: firstExpectedNotificationRecipientDto.notification.priorityLevel},
            createdAt: now,
            updatedAt: now
        },
    };

    const secondNotificationRecipient = {
        read: aecondExpectedNotificationRecipientDto.read,
        createdAt: now,
        updatedAt: now,
        notification: {
            id: aecondExpectedNotificationRecipientDto.notification.id,
            title: aecondExpectedNotificationRecipientDto.notification.title,
            message: aecondExpectedNotificationRecipientDto.notification.message,
            priority: {level: aecondExpectedNotificationRecipientDto.notification.priorityLevel},
            createdAt: now,
            updatedAt: now
        },
    };

    notificationRecipientDaoMock.findVisibleByRecipient.mockResolvedValueOnce([firstNotificationRecipient, secondNotificationRecipient]);


    const request = new GetVisibleNotificationRecipientsRequestDto({ currentUserEmail: 'user@example.com' });
    const result = await svc.getVisible(request);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(firstExpectedNotificationRecipientDto);
    expect(result[1]).toEqual(aecondExpectedNotificationRecipientDto);
  });

  it('should throw a missing association error if the Notification of a NotificaitonRecipient lacks a priority association', async () => {

    marketplaceUserDaoMock.findByEmail.mockResolvedValueOnce({ id: 1, email: 'judge@example.com' });
    const now = new Date();
    const nowIsoString = now.toISOString();

    const expectedNotificationRecipientDto = new NotificationRecipientDto({
        notification: {
            id: 1,
            title: 'Notification 1',
            message: 'This is the first Notification',
            priorityLevel: 3,
            createdAt: nowIsoString,
            updatedAt: nowIsoString
        },
        read: false,
        createdAt: nowIsoString,
        updatedAt: nowIsoString,
    });

    const notificationRecipient = {
        read: expectedNotificationRecipientDto.read,
        createdAt: now,
        updatedAt: now,
        notification: {
            id: expectedNotificationRecipientDto.notification.id,
            title: expectedNotificationRecipientDto.notification.title,
            message: expectedNotificationRecipientDto.notification.message,
            createdAt: now,
            updatedAt: now
        },
    };
    notificationRecipientDaoMock.findVisibleByRecipient.mockResolvedValueOnce([notificationRecipient]);
    const request = new GetVisibleNotificationRecipientsRequestDto({ currentUserEmail: 'user@example.com' });
    await expect(svc.getVisible(request)).rejects.toThrow("Missing required association 'priority' on entity 'Notification'.");
  });
  it('should throw a missing association error if a NotificaitonRecipient lacks a notification association', async () => {

    marketplaceUserDaoMock.findByEmail.mockResolvedValueOnce({ id: 1, email: 'judge@example.com' });
    const now = new Date();
    const nowIsoString = now.toISOString();

    const expectedNotificationRecipientDto = new NotificationRecipientDto({
        notification: {
            id: 1,
            title: 'Notification 1',
            message: 'This is the first Notification',
            priorityLevel: 3,
            createdAt: nowIsoString,
            updatedAt: nowIsoString
        },
        read: false,
        createdAt: nowIsoString,
        updatedAt: nowIsoString,
    });

    const notificationRecipient = {
        read: expectedNotificationRecipientDto.read,
        createdAt: now,
        updatedAt: now,
    };
    notificationRecipientDaoMock.findVisibleByRecipient.mockResolvedValueOnce([notificationRecipient]);
    const request = new GetVisibleNotificationRecipientsRequestDto({ currentUserEmail: 'user@example.com' });
    await expect(svc.getVisible(request)).rejects.toThrow("Missing required association 'notification' on entity 'NotificationRecipient'.");
  });
  
});
