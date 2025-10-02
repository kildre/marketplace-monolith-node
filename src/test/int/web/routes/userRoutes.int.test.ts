import request from 'supertest';
import express from 'express';
import userRoutes from 'src/main/web/routes/userRoutes';
import endpointService from '../../../../main/service/userEndpointService';

jest.mock('src/main/service/userEndpointService', () => ({
  __esModule: true, // 👈 This is critical for default exports
  default: {
    isAuthorizedAdjudicator: jest.fn(() => ({
      hasRole: true,
    })),
  },
}));

// Create an Express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);


describe('POST /api/users/isAuthorizedAdjudicator', () => {
  it('should return 200 with expected response', async () => {
    const spy = jest.spyOn(endpointService, 'isAuthorizedAdjudicator');
    const response = await request(app)
      .post('/api/users/isAuthorizedAdjudicator')
      .send({ userEmail: 'user@example.com' });

    expect(spy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      hasRole: true,
    });
  });
});
