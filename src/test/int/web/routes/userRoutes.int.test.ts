// src/test/web/routes/userRoutes.isAuthorizedAdjudicator.test.ts
import request from 'supertest';
import express from 'express';

// ---- Mock the exact path used inside userRoutes ----
const mockUserEndpointService = {
  // service now returns a Promise and accepts (dto, req)
  isAuthorizedAdjudicator: jest.fn().mockResolvedValue({ hasRole: true }),
};

jest.mock('../../../../main/service/userEndpointService', () => ({
  __esModule: true,
  default: mockUserEndpointService,
}));

// Import the router *after* the mock so it picks up our mock
import userRoutes from '../../../../main/web/routes/userRoutes';

const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);

describe('POST /api/users/isAuthorizedAdjudicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and expected body', async () => {
    const response = await request(app)
      .post('/api/users/isAuthorizedAdjudicator')
      .send({ userEmail: 'user@example.com' });

    // service is called with (dto, req)
    expect(mockUserEndpointService.isAuthorizedAdjudicator).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: 'user@example.com' }),
      expect.any(Object) // the Express Request
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ hasRole: true });
  });
});
