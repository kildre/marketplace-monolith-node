// src/test/unit/web/controller/sessionController.unit.test.ts
import type { Request, Response } from 'express';
import {
  registerSessionController,
  getSessionStatusController,
  expireSessionController,
} from '../../../../main/web/controllers/sessionController';
import ConstraintError from '../../../../main/domain/errors/ConstraintError';

// Mocks for dependencies imported by the controller
jest.mock('../../../../main/service/sessionTokenService', () => ({
  sessionTokenService: {
    getAnyBySessionId: jest.fn(),
    storeTokenForSession: jest.fn(),
    deleteSessionBySessionId: jest.fn(),
  },
}));

// IMPORTANT: match the controller's import path: "../../config/authConfig"
jest.mock('../../../../main/config/authConfig', () => ({
  getAuthToken: jest.fn(),
  getCache: jest.fn(),
}));

// DTO mocks so we can simulate validation success/failure
jest.mock('../../../../main/web/dtos/RegisterSessionRequestDto', () => ({
  __esModule: true,
  default: class RegisterSessionRequestDto {
    sessionId: string;
    refreshToken?: string | null;
    constructor(data: any) {
      if (data && data.__throwConstraint) {
        throw new (ConstraintError as any)([{ msg: 'invalid' }]);
      }
      this.sessionId = data.sessionId;
      this.refreshToken = data.refreshToken ?? null;
    }
  },
}));

jest.mock('../../../../main/web/dtos/GetSessionRequestDto', () => ({
  __esModule: true,
  default: class GetSessionRequestDto {
    sessionId: string;
    constructor(data: any) {
      if (data && data.__throwConstraint) {
        throw new (ConstraintError as any)([{ msg: 'invalid' }]);
      }
      this.sessionId = data.sessionId;
    }
  },
}));

jest.mock('../../../../main/web/dtos/ExpireSessionRequestDto', () => ({
  __esModule: true,
  default: class ExpireSessionRequestDto {
    sessionId: string;
    constructor(data: any) {
      if (data && data.__throwConstraint) {
        throw new (ConstraintError as any)([{ msg: 'invalid' }]);
      }
      this.sessionId = data.sessionId;
    }
  },
}));

// Mock ExpireSessionResponseDto to avoid class-validator side effects and simplify success path
jest.mock('../../../../main/web/dtos/ExpireSessionResponseDto', () => ({
  __esModule: true,
  default: class ExpireSessionResponseDto {
    success: boolean;
    message?: string;
    constructor(data: any) {
      this.success = data.success;
      this.message = data.message;
    }
  },
}));

// Helper to build mock Response
function makeRes() {
  const res: Partial<Response> & { body?: any; statusCode?: number } = {
    status: jest.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }) as any,
    json: jest.fn(function (this: any, obj: any) {
      this.body = obj;
      return this;
    }) as any,
  };
  return res as Response & { body?: any; statusCode?: number };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    params: {},
    query: {},
    body: {},
    method: 'POST',
    path: '/api/session/register',
    ...overrides,
  } as unknown as Request;
}

const { sessionTokenService } = require('../../../../main/service/sessionTokenService');
// IMPORTANT: match the jest.mock path above
const { getAuthToken, getCache } = require('../../../../main/config/authConfig');

describe('sessionController unit tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =============================================================
  // registerSessionController
  // =============================================================
  describe('registerSessionController', () => {
    it('returns 201 on successful registration', async () => {
      (getAuthToken as jest.Mock).mockReturnValue('Bearer abc');
      (getCache as jest.Mock).mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
        sub: 'user-sub',
        realm_access: { roles: ['r1'] },
        resource_access: {},
      });
      (sessionTokenService.getAnyBySessionId as jest.Mock).mockResolvedValue(null); // no existing
      (sessionTokenService.storeTokenForSession as jest.Mock).mockResolvedValue({ sessionId: 'sid-1' });

      const req = makeReq({ body: { sessionId: 'sid-1' } });
      const res = makeRes();
      await registerSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body).toMatchObject({ sessionId: 'sid-1', stored: true });
    });

    it('returns 401 when sessionId already exists', async () => {
      (getAuthToken as jest.Mock).mockReturnValue('Bearer abc');
      (getCache as jest.Mock).mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      (sessionTokenService.getAnyBySessionId as jest.Mock).mockResolvedValue({ sessionId: 'sid-1' });

      const req = makeReq({ body: { sessionId: 'sid-1' } });
      const res = makeRes();
      await registerSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.error).toBe('Session already exists');
      expect(res.body).toMatchObject({ sessionId: 'sid-1', stored: false });
    });

    it('returns 401 when missing access token', async () => {
      (getAuthToken as jest.Mock).mockReturnValue(undefined);
      const req = makeReq({ body: { sessionId: 'sid-1' } });
      const res = makeRes();
      await registerSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.error).toBe('Session already exists');
    });

    it('returns 401 when introspection invalid / missing exp', async () => {
      (getAuthToken as jest.Mock).mockReturnValue('Bearer abc');
      (getCache as jest.Mock).mockReturnValue(null);
      const req = makeReq({ body: { sessionId: 'sid-1' } });
      const res = makeRes();
      await registerSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.body.error).toBe('Session already exists');
    });

    it('returns 400 when DTO validation fails (ConstraintError)', async () => {
      const req = makeReq({ body: { sessionId: 'sid-1', __throwConstraint: true } });
      const res = makeRes();
      await registerSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.error).toBe('Invalid request body');
    });

    it('returns 500 on unexpected error', async () => {
      (getAuthToken as jest.Mock).mockReturnValue('Bearer abc');
      (getCache as jest.Mock).mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      (sessionTokenService.getAnyBySessionId as jest.Mock).mockRejectedValue(new Error('Boom'));

      const req = makeReq({ body: { sessionId: 'sid-1' } });
      const res = makeRes();
      await registerSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body.error).toBe('Failed to register session');
    });
  });

  // =============================================================
  // getSessionStatusController
  // =============================================================
  describe('getSessionStatusController', () => {
    function makeGetReq(sessionId: string, overrides: any = {}): Request {
      return makeReq({ method: 'GET', params: { sessionId }, ...overrides });
    }

    it('returns 200 when session found', async () => {
      (sessionTokenService.getAnyBySessionId as jest.Mock).mockResolvedValue({
        sessionId: 'sid-2',
        accessToken: 'tok',
        refreshToken: 'ref',
      });
      const req = makeGetReq('sid-2');
      const res = makeRes();
      await getSessionStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body).toMatchObject({
        sessionId: 'sid-2',
        token: 'tok',
        refreshToken: 'ref',
      });
    });

    it('returns 404 when session not found', async () => {
      (sessionTokenService.getAnyBySessionId as jest.Mock).mockResolvedValue(null);
      const req = makeGetReq('missing');
      const res = makeRes();
      await getSessionStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toMatchObject({
        sessionId: 'missing',
        token: '',
        refreshToken: '',
      });
    });

    it('returns 400 on ConstraintError', async () => {
      (sessionTokenService.getAnyBySessionId as jest.Mock).mockImplementation(() => {
        throw new ConstraintError([{ msg: 'bad' }] as any);
      });
      const req = makeGetReq('sid-err');
      const res = makeRes();
      await getSessionStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.error).toBe('Invalid request');
    });

    it('returns 500 on unexpected error', async () => {
      (sessionTokenService.getAnyBySessionId as jest.Mock).mockImplementation(() => {
        throw new Error('Crash');
      });
      const req = makeGetReq('sid-err2');
      const res = makeRes();
      await getSessionStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body.error).toBe('Failed to get session status');
    });
  });

  // =============================================================
  // expireSessionController
  // =============================================================
  describe('expireSessionController', () => {
    function makeExpireReq(body: any): Request {
      return makeReq({ body, path: '/api/session/expire' });
    }

    it('returns 200 when session deleted', async () => {
      (sessionTokenService.deleteSessionBySessionId as jest.Mock).mockResolvedValue(true);
      (sessionTokenService.getAnyBySessionId as jest.Mock).mockResolvedValue({
        sessionId: 'sid-del',
      });

      const req = makeExpireReq({ sessionId: 'sid-del' });
      const res = makeRes();
      await expireSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body).toMatchObject({
        success: true,
        message: 'Session expired',
      });
    });

    it('returns 404 when session not found', async () => {
      (sessionTokenService.deleteSessionBySessionId as jest.Mock).mockResolvedValue(false);
      const req = makeExpireReq({ sessionId: 'sid-missing' });
      const res = makeRes();
      await expireSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body).toMatchObject({
        success: false,
        message: 'Session not found',
      });
    });

    it('returns 400 on ConstraintError', async () => {
      // Trigger via DTO mock flag
      const req = makeExpireReq({ sessionId: 'sid-x', __throwConstraint: true });
      const res = makeRes();
      await expireSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.error).toBe('Invalid request body');
    });

    it('returns 500 on unexpected error', async () => {
      (sessionTokenService.deleteSessionBySessionId as jest.Mock).mockRejectedValue(
        new Error('Boom delete')
      );
      const req = makeExpireReq({ sessionId: 'sid-crash' });
      const res = makeRes();
      await expireSessionController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Failed to expire session');
    });
  });
});
