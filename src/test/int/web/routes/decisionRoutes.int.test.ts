import express from 'express';
import request from 'supertest';

/** IMPORTANT: this path MUST match the controller's import */
jest.mock('../../../../main/service/decisionEndpointService', () => {
  const submit = jest.fn();
  return {
    __esModule: true,
    DecisionEndpointService: jest.fn().mockImplementation(() => ({
      submit,
    })),
  };
});

// Import AFTER the mock so the controller constructs the mocked service
import decisionRouter from '../../../../main/web/routes/decisionRoutes';
import { DecisionEndpointService } from '../../../../main/service/decisionEndpointService';
import { errorHandler } from 'src/main/middleware/errorHandler';

type MockSvc = { submit: jest.Mock };
const MockCtor = DecisionEndpointService as unknown as jest.Mock;

let app: express.Express;
let svc: MockSvc;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/decisions', decisionRouter);
  app.use(errorHandler);

  // Cache the single instance that the controller constructed
  svc = (MockCtor.mock.results[0]?.value || MockCtor.mock.instances[0]) as MockSvc;
  if (!svc) {
    throw new Error(
      'Mock DecisionEndpointService was not instantiated. Check the import path in jest.mock matches the controller.'
    );
  }
});

afterEach(() => {
  // DO NOT use jest.clearAllMocks() here — it clears constructor call history.
  svc.submit.mockReset(); // reset calls/implementations between tests
});

describe('POST /decisions (router + controller integration)', () => {
  it('returns 200 with service response on success', async () => {
    svc.submit.mockResolvedValueOnce({ decisionNumber: 'DEC-42' });

    const payload = {
      adjudicatorEmail: 'judge@example.com',
      requestNumber: 'REQ-1001',
      statusId: 2,
      decisionNumber: 'DEC-42',
      ticketType: 'TYPE_A',
      asset: 'Server',
      quantity: 3,
      estimatedPrice: 9999.99,
      comments: 'Approved',
    };

    const res = await request(app).post('/decisions').send(payload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ decisionNumber: 'DEC-42' });
    expect(svc.submit).toHaveBeenCalledTimes(1);
    expect(svc.submit.mock.calls[0][0]).toMatchObject({
      adjudicatorEmail: payload.adjudicatorEmail,
      requestNumber: payload.requestNumber,
      statusId: payload.statusId,
      decisionNumber: payload.decisionNumber,
      ticketType: payload.ticketType,
      asset: payload.asset,
      quantity: payload.quantity,
      estimatedPrice: payload.estimatedPrice,
      comments: payload.comments,
    });
  });

  it('propagates service errors to error handler (Unauthorized path)', async () => {
    const err = new Error(
      'The provided email address no-role@example.com does not correspond to an authorized requestor.'
    ) as any;
    err.status = 403;
    svc.submit.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/decisions')
      .send({ adjudicatorEmail: 'no-role@example.com', requestNumber: 'REQ-1002', statusId: 2 });

    expect(res.status).toBe(403);
    expect(res.body.errMsg).toMatch(/authorized/i);
  });

  it('returns a validation error when body is invalid', async () => {
    const err = new Error('adjudicatorEmail is required') as any;
    err.status = 400;
    svc.submit.mockRejectedValueOnce(err);

    const res = await request(app)
      .post('/decisions')
      .send({ /* missing adjudicatorEmail */ requestNumber: 'REQ-1003', statusId: 2 });

    expect(res.status).toEqual(400);
    expect(res.body.errMsg).toMatch(/adjudicatorEmail is required/i);
  });
});
