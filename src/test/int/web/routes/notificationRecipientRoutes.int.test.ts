// src/test/web/routes/userRoutes.isAuthorizedAdjudicator.test.ts
import request from 'supertest';
import express from 'express';
import { NotificationRecipientEndpointServiceI } from 'src/main/service/notificationRecipientEndpointService';

const expectedResult = [{notification: {id: 1}, read: false}, {notification: {id: 2}, read: false}]
const mockNotificationRecipientEndpointService: NotificationRecipientEndpointServiceI = {
  getVisible: jest.fn().mockResolvedValue(expectedResult),
};

jest.mock('../../../../main/service/notificationRecipientEndpointService', () => ({
  __esModule: true,
  default: mockNotificationRecipientEndpointService,
}));

// Import the router *after* the mock so it picks up our mock
import notificationRecipientRoutes from '../../../../main/web/routes/notificationRecipientRoutes';
import { errorHandler } from 'src/main/middleware/errorHandler';

const app = express();
const basePath = '/api/notificationRecipients';
app.use(express.json());
app.use(basePath, notificationRecipientRoutes);
app.use(errorHandler);

describe(`POST ${basePath}/visible`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and expected body', async () => {
    const response = await request(app)
      .post(`${basePath}/visible`)
      .send({ currentUserEmail: 'user@example.com' });

    // service is called with (dto, req)
    expect(mockNotificationRecipientEndpointService.getVisible).toHaveBeenCalledWith(
      expect.objectContaining({ currentUserEmail: 'user@example.com' })
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expectedResult);
  });

    it('returns a validation error when body is invalid', async () => {
        const response = await request(app)
            .post(`${basePath}/visible`)
            .send({}); // missing currentUserEmail

        expect(response.status).toBe(500);
        expect(response.body.errMsg).toMatch(/ConstraintError: currentUserEmail: currentUserEmail should not be empty, currentUserEmail must be a string/i);
    });
});
