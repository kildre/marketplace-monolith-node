// src/test/web/routes/notificationRecipientRoutes.int.test.ts
import request from 'supertest';
import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { NotificationRecipientEndpointServiceI } from 'src/main/service/notificationRecipientEndpointService';

const expectedResult = [{notification: {id: 1}, read: false}, {notification: {id: 2}, read: false}];
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

// Test user data
const testUser = { id: 1, email: 'user@example.com' };

// Middleware to inject currentUser (simulates auth middleware)
const injectCurrentUser = (user: any) => (req: Request, res: Response, next: NextFunction) => {
  req.currentUser = user;
  next();
};

const createApp = (currentUser?: any) => {
  const app = express();
  const basePath = '/api/notificationRecipients';

  app.use(express.json());

  // Inject currentUser before routes (simulates auth middleware)
  if (currentUser !== undefined) {
    app.use(injectCurrentUser(currentUser));
  }

  app.use(basePath, notificationRecipientRoutes);
  app.use(errorHandler);

  return app;
};

describe(`GET /api/notificationRecipients/visible`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and expected body when user is authenticated', async () => {
    const app = createApp(testUser);

    const response = await request(app)
      .get('/api/notificationRecipients/visible');

    // service is called with the current user
    expect(mockNotificationRecipientEndpointService.getVisible).toHaveBeenCalledWith(testUser);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expectedResult);
  });

  it('returns 404 error when currentUser is not set (simulating missing auth)', async () => {
    const app = createApp(null); // Explicitly set to null to simulate no auth

    const response = await request(app)
      .get('/api/notificationRecipients/visible');

    expect(response.status).toBe(404);
    expect(response.body.errMsg).toMatch(/Current User not found/i);
  });

  it('returns 404 error when currentUser middleware is not applied', async () => {
    const app = createApp(); // No currentUser middleware applied

    const response = await request(app)
      .get('/api/notificationRecipients/visible');

    expect(response.status).toBe(404);
    expect(response.body.errMsg).toMatch(/Current User not found/i);
  });
});
