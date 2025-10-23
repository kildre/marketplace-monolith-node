// src/test/unit/web/controller/requestController.unit.test.ts
import 'reflect-metadata';
import type { Request, Response, NextFunction } from 'express';

// 1) Mock the EXACT path your controller imports
jest.mock('../../../../main/service/requestEndpointService', () => {
  const submit = jest.fn();
  const viewPendingRequests = jest.fn();
  const viewAllRequests = jest.fn();
  const viewRequestsForRequestor = jest.fn();
  const viewRequestForRequestNumber = jest.fn();
  return {
    __esModule: true,
    RequestEndpointService: jest.fn().mockImplementation(() => ({
      submit,
      viewPendingRequests,
      viewAllRequests,
      viewRequestsForRequestor,
      viewRequestForRequestNumber,
    })),
  };
});

// 2) Mock DTOs to bypass class-validator/transformer logic
jest.mock('../../../../main/web/dtos/SubmitRequestRequestDto', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((o) => o),
}));
jest.mock('../../../../main/web/dtos/ViewRequestsRequestDto', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((o) => o),
}));
jest.mock('../../../../main/web/dtos/ViewRequestByRequestNumDto', () => ({
  // ✅ FIXED: added `/main/` segment so it matches controller's import path
  __esModule: true,
  default: jest.fn().mockImplementation((o) => o),
}));

// SUT (after mocks)
import controller from '../../../../main/web/controllers/requestController';
import { RequestEndpointService } from '../../../../main/service/requestEndpointService';

type MockSvc = {
  submit: jest.Mock;
  viewPendingRequests: jest.Mock;
  viewAllRequests: jest.Mock;
  viewRequestsForRequestor: jest.Mock;
  viewRequestForRequestNumber: jest.Mock;
};

const MockCtor = RequestEndpointService as unknown as jest.Mock;
let svc: MockSvc;

const makeRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

const makeNext = () => jest.fn() as unknown as NextFunction;

beforeAll(() => {
  // cache the instance constructed at module-load time by the controller
  svc = (MockCtor.mock.results[0]?.value || MockCtor.mock.instances[0]) as MockSvc;
  if (!svc) throw new Error('Mock RequestEndpointService was not instantiated. Check jest.mock path.');
});

afterEach(() => {
  // reset method mocks only
  svc.submit.mockReset();
  svc.viewPendingRequests.mockReset();
  svc.viewAllRequests.mockReset();
  svc.viewRequestsForRequestor.mockReset();
  svc.viewRequestForRequestNumber.mockReset();
});

describe('requestController', () => {
  describe('submit', () => {
    it('returns 200 + body on success and forwards DTO fields', async () => {
      const res = makeRes();
      const next = makeNext();
      const payload = { requestorEmail: 'user@example.com', productId: 10, quantity: 3, comments: 'please' };
      const serviceResponse = { requestNumber: 'REQ-123' };
      svc.submit.mockResolvedValueOnce(serviceResponse);

      await controller.submit({ body: payload } as unknown as Request, res, next);

      expect(svc.submit).toHaveBeenCalledTimes(1);
      expect(svc.submit.mock.calls[0][0]).toMatchObject(payload);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResponse);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next(err) on error', async () => {
      const res = makeRes();
      const next = makeNext();
      const err = new Error('boom');
      svc.submit.mockRejectedValueOnce(err);

      await controller.submit({ body: {} } as unknown as Request, res, next);

      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('viewPendingRequests', () => {
    it('returns 200 + body on success', async () => {
      const res = makeRes();
      const next = makeNext();
      const payload = { page: 1, pageSize: 20 };
      const serviceResponse = { requests: [{ id: 1 }], total: 1 };
      svc.viewPendingRequests.mockResolvedValueOnce(serviceResponse);

      await (controller as any).viewPendingRequests({ body: payload } as Request, res, next);

      expect(svc.viewPendingRequests).toHaveBeenCalledTimes(1);
      expect(svc.viewPendingRequests.mock.calls[0][0]).toMatchObject(payload);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResponse);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next(err) on error', async () => {
      const res = makeRes();
      const next = makeNext();
      const err = new Error('nope');
      svc.viewPendingRequests.mockRejectedValueOnce(err);

      await (controller as any).viewPendingRequests({ body: {} } as Request, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('viewAllRequests', () => {
    it('returns 200 + body on success', async () => {
      const res = makeRes();
      const next = makeNext();
      const payload = { page: 2, pageSize: 10, sortBy: 'createdAt' };
      const serviceResponse = { requests: [{ id: 7 }], total: 10 };
      svc.viewAllRequests.mockResolvedValueOnce(serviceResponse);

      await (controller as any).viewAllRequests({ body: payload } as Request, res, next);

      expect(svc.viewAllRequests).toHaveBeenCalledTimes(1);
      expect(svc.viewAllRequests.mock.calls[0][0]).toMatchObject(payload);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResponse);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next(err) on error', async () => {
      const res = makeRes();
      const next = makeNext();
      const err = new Error('fail');
      svc.viewAllRequests.mockRejectedValueOnce(err);

      await (controller as any).viewAllRequests({ body: {} } as Request, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('viewRequestsForRequestor', () => {
    it('returns 200 + body on success', async () => {
      const res = makeRes();
      const next = makeNext();
      const payload = { requestorEmail: 'u@example.com', page: 1, pageSize: 5 };
      const serviceResponse = { requests: [{ id: 2 }], total: 1 };
      svc.viewRequestsForRequestor.mockResolvedValueOnce(serviceResponse);

      await (controller as any).viewRequestsForRequestor({ body: payload } as Request, res, next);

      expect(svc.viewRequestsForRequestor).toHaveBeenCalledTimes(1);
      expect(svc.viewRequestsForRequestor.mock.calls[0][0]).toMatchObject(payload);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResponse);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next(err) on error', async () => {
      const res = makeRes();
      const next = makeNext();
      const err = new Error('bad');
      svc.viewRequestsForRequestor.mockRejectedValueOnce(err);

      await (controller as any).viewRequestsForRequestor({ body: {} } as Request, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe('viewRequestByRequestNumber', () => {
    it('returns 200 + body on success', async () => {
      const res = makeRes();
      const next = makeNext();
      const payload = { requestNumber: 'REQ-999' };
      const serviceResponse = { id: 42, requestNumber: 'REQ-999' };
      svc.viewRequestForRequestNumber.mockResolvedValueOnce(serviceResponse);

      await (controller as any).viewRequestByRequestNumber({ body: payload } as Request, res, next);

      expect(svc.viewRequestForRequestNumber).toHaveBeenCalledTimes(1);
      expect(svc.viewRequestForRequestNumber.mock.calls[0][0]).toMatchObject(payload);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(serviceResponse);
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next(err) on error', async () => {
      const res = makeRes();
      const next = makeNext();
      const err = new Error('not found');
      svc.viewRequestForRequestNumber.mockRejectedValueOnce(err);

      await (controller as any).viewRequestByRequestNumber({ body: {} } as Request, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
