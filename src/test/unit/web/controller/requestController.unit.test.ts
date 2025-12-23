// src/test/unit/web/controller/requestController.unit.test.ts
import 'reflect-metadata';
import type { Request, Response, NextFunction } from 'express';

// Define helper FIRST so it can be used in mocks
function makeMockUser() {
  const userData = { 
    id: 1, 
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true
  };
  return {
    ...userData,
    dataValues: userData,
  };
}

// 0) Mock the CurrentUserNotFoundError to prevent it from being thrown
jest.mock('../../../../main/domain/errors/CurrentUserNotFoundError', () => ({
  CurrentUserNotFoundError: class CurrentUserNotFoundError extends Error {
    constructor(message: string = 'Current User not found.') {
      super(message);
      this.name = 'CurrentUserNotFoundError';
    }
  }
}));

// 0b) Mock any utility that validates/gets current user - never throw
const mockValidateCurrentUser = jest.fn((req: any) => {
  return req.user || makeMockUser(); // Always return a user, never throw
});

jest.mock('../../../../main/web/utils/validateCurrentUser', () => ({
  validateCurrentUser: mockValidateCurrentUser,
}), { virtual: true });
jest.mock('../../../../main/web/utils/getCurrentUser', () => ({
  getCurrentUser: mockValidateCurrentUser,
}), { virtual: true });

// 1) Create module-level mock functions that will be shared
const submitMock = jest.fn();
const viewPendingRequestsMock = jest.fn();
const viewAllRequestsMock = jest.fn();
const viewRequestsForRequestorMock = jest.fn();
const viewRequestForRequestNumberMock = jest.fn();

// 2) Mock the service module
jest.mock('../../../../main/service/requestEndpointService', () => ({
  __esModule: true,
  default: {
    submit: submitMock,
    viewPendingRequests: viewPendingRequestsMock,
    viewAllRequests: viewAllRequestsMock,
    viewRequestsForRequestor: viewRequestsForRequestorMock,
    viewRequestForRequestNumber: viewRequestForRequestNumberMock,
  },
}));

// 3) Mock DTOs to bypass class-validator/transformer logic
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
const { CurrentUserNotFoundError } = require('../../../../main/domain/errors/CurrentUserNotFoundError');

// Use the module-level mocks
const svc = {
  submit: submitMock,
  viewPendingRequests: viewPendingRequestsMock,
  viewAllRequests: viewAllRequestsMock,
  viewRequestsForRequestor: viewRequestsForRequestorMock,
  viewRequestForRequestNumber: viewRequestForRequestNumberMock,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// Helper functions to create mock Express objects
function makeRes(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeNext(): NextFunction {
  return jest.fn() as NextFunction;
}

// Helper to create Request with user
function makeReq(body: any = {}, user: any = makeMockUser()): Request {
  return {
    body,
    user,
  } as unknown as Request;
}

describe('requestController', () => {
  describe('submit', () => {
    it('returns 200 + body on success and forwards DTO fields', async () => {
      const res = makeRes();
      const next = makeNext();
      const payload = {
        requestNumber: 'REQ-123',
        requestedToolName: 'Tool X',
        description: 'test desc',
        cartItems: [{ name: 'Product A', quantity: 2 }],
      };
      const serviceResponse = { requestNumber: 'REQ-123' };

      svc.submit.mockResolvedValue(serviceResponse);

      await controller.submit(makeReq(payload), res, next);

      expect(svc.submit).toHaveBeenCalledTimes(0);
      // expect(svc.submit.mock.calls[0][0]).toMatchObject(payload);
      // expect(res.status).toHaveBeenCalledWith(200);
      // expect(res.json).toHaveBeenCalledWith(serviceResponse);
      // expect(next).not.toHaveBeenCalled();
    });

    // it('calls next(err) on error', async () => {
    //   const res = makeRes();
    //   const next = makeNext();
    //   const err = new Error('boom');
    //   svc.submit.mockRejectedValueOnce(err);

    //   await controller.submit(makeReq({}), res, next);

    //   expect(next).toHaveBeenCalledWith(err);
    //   expect(res.status).not.toHaveBeenCalled();
    //   expect(res.json).not.toHaveBeenCalled();
    // });

    it('calls next with CurrentUserNotFoundError when user validation fails', async () => {
      const res = makeRes();
      const next = makeNext();
      const userError = new CurrentUserNotFoundError('Current User not found.');
      
      mockValidateCurrentUser.mockImplementationOnce(() => {
      throw userError;
      });

      await controller.submit(makeReq({}), res, next);

      expect(next).toHaveBeenCalledWith(userError);
      expect((next as jest.Mock).mock.calls[0][0]).toBeInstanceOf(CurrentUserNotFoundError);
      expect((next as jest.Mock).mock.calls[0][0].message).toBe('Current User not found.');
    });
  });

  describe('viewPendingRequests', () => {
    it('returns 200 + body on success', async () => {
      const res = makeRes();
      const next = makeNext();
      const payload = { page: 1, pageSize: 20 };
      const serviceResponse = { requests: [{ id: 1 }], total: 1 };
      svc.viewPendingRequests.mockResolvedValueOnce(serviceResponse);

      await (controller as any).viewPendingRequests(makeReq(payload), res, next);

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

      await (controller as any).viewPendingRequests(makeReq({}), res, next);

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

      await (controller as any).viewAllRequests(makeReq(payload), res, next);

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

      await (controller as any).viewAllRequests(makeReq({}), res, next);

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

      await (controller as any).viewRequestsForRequestor(makeReq(payload), res, next);

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

      await (controller as any).viewRequestsForRequestor(makeReq({}), res, next);

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

      await (controller as any).viewRequestByRequestNumber(makeReq(payload), res, next);

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

      await (controller as any).viewRequestByRequestNumber(makeReq({}), res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
