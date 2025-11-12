import { errorHandler } from '../../../main/middleware/errorHandler';
import ErrorDto from '../../../main/web/dtos/ErrorDto';
import ConstraintError from '../../../main/domain/errors/ConstraintError';
import { ValidationError } from 'class-validator';
import { AuthenticationError } from '../../../main/domain/errors/AuthenticationError';
import { UnauthorizedAdjudicatorError } from '../../../main/domain/errors/UnauthorizedAdjudicatorError';
import { UnauthorizedRequestorError } from '../../../main/domain/errors/UnauthorizedRequestorError';
import { UnauthorizedUserError } from '../../../main/domain/errors/UnauthorizedUserError';

// Mocks
const mockReq = {} as any;
const mockRes = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
} as any;
const mockNext = jest.fn();

jest.mock('../../../main/service/loggingService', () => ({
  error: jest.fn(),
  warn: jest.fn(),
}));
const logger = require('../../../main/service/loggingService');

describe('errorHandler middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log error and return ErrorDto with default 500 status', () => {
    const err = new Error('Test error');
    errorHandler(err, mockReq, mockRes, mockNext);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error: Test error'));
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(new ErrorDto('Error: Test error'));
  });

  it('should use custom status and error name if provided', () => {
    const err = new Error('Custom error');
    (err as any).status = 404;
    err.name = 'CustomError';
    errorHandler(err, mockReq, mockRes, mockNext);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('CustomError: Custom error'));
    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(new ErrorDto('CustomError: Custom error'));
  });

  it('should extract and format validation errors from ConstraintError', () => {
    const validationError = new ValidationError();
    validationError.property = 'email';
    validationError.constraints = { isEmail: 'email must be a valid email' };
    
    const err = new ConstraintError([validationError]);
    errorHandler(err, mockReq, mockRes, mockNext);
    
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ConstraintError: email: email must be a valid email'));
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(new ErrorDto('ConstraintError: email: email must be a valid email'));
  });

  it('should format multiple validation errors from ConstraintError', () => {
    const error1 = new ValidationError();
    error1.property = 'email';
    error1.constraints = { isEmail: 'email must be a valid email' };
    
    const error2 = new ValidationError();
    error2.property = 'phoneNumber';
    error2.constraints = { isPhoneNumber: 'phoneNumber must be a valid phone number' };
    
    const err = new ConstraintError([error1, error2]);
    errorHandler(err, mockReq, mockRes, mockNext);
    
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ConstraintError: email: email must be a valid email; phoneNumber: phoneNumber must be a valid phone number'));
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(new ErrorDto('ConstraintError: email: email must be a valid email; phoneNumber: phoneNumber must be a valid phone number'));
  });

  it('should extract nested validation errors from array/object properties', () => {
    const nestedError = new ValidationError();
    nestedError.property = 'productId';
    nestedError.constraints = { isNotEmpty: 'productId should not be empty' };
    
    const parentError = new ValidationError();
    parentError.property = 'cartItems';
    parentError.children = [nestedError];
    
    const err = new ConstraintError([parentError]);
    errorHandler(err, mockReq, mockRes, mockNext);
    
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ConstraintError: cartItems.productId: productId should not be empty'));
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(new ErrorDto('ConstraintError: cartItems.productId: productId should not be empty'));
  });

  it('should handle deeply nested validation errors', () => {
    const deepNestedError = new ValidationError();
    deepNestedError.property = 'id';
    deepNestedError.constraints = { isNumber: 'id must be a number' };
    
    const nestedError = new ValidationError();
    nestedError.property = '0';
    nestedError.children = [deepNestedError];
    
    const parentError = new ValidationError();
    parentError.property = 'items';
    parentError.children = [nestedError];
    
    const err = new ConstraintError([parentError]);
    errorHandler(err, mockReq, mockRes, mockNext);
    
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ConstraintError: items.0.id: id must be a number'));
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(new ErrorDto('ConstraintError: items.0.id: id must be a number'));
  });

  describe('UnauthorizedAdjudicatorError', () => {
    it('should handle UnauthorizedAdjudicatorError with legacy string constructor', () => {
      const err = new UnauthorizedAdjudicatorError('adjudicator@example.com');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AUTHZ_ERROR]')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('user=adjudicator@example.com')
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UnauthorizedAdjudicatorError',
        message: expect.stringContaining('adjudicator@example.com'),
        code: 'UNAUTHORIZED_ADJUDICATOR',
        status: 403,
      });
    });

    it('should handle UnauthorizedAdjudicatorError with full options', () => {
      const err = new UnauthorizedAdjudicatorError({
        adjudicatorEmail: 'user@example.com',
        requiredRole: 'ADJUDICATOR',
        actualRoles: ['REQUESTOR'],
      });
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AUTHZ_ERROR]')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('user=user@example.com')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('required_role=ADJUDICATOR')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('actual_roles=["REQUESTOR"]')
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UnauthorizedAdjudicatorError',
        message: expect.stringContaining('user@example.com'),
        code: 'UNAUTHORIZED_ADJUDICATOR',
        status: 403,
      });
    });

    it('should handle UnauthorizedAdjudicatorError without optional role information', () => {
      const err = new UnauthorizedAdjudicatorError({
        adjudicatorEmail: 'noauth@example.com',
      });
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AUTHZ_ERROR]')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('user=noauth@example.com')
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UnauthorizedAdjudicatorError',
        message: expect.stringContaining('noauth@example.com'),
        code: 'UNAUTHORIZED_ADJUDICATOR',
        status: 403,
      });
    });

    it('should verify UnauthorizedAdjudicatorError instanceof UnauthorizedUserError', () => {
      const err = new UnauthorizedAdjudicatorError({
        adjudicatorEmail: 'test@example.com',
      });

      expect(err).toBeInstanceOf(UnauthorizedUserError);
      expect(err).toBeInstanceOf(UnauthorizedAdjudicatorError);
      expect(err.code).toBe('UNAUTHORIZED_ADJUDICATOR');
      expect(err.status).toBe(403);
    });
  });

  describe('UnauthorizedRequestorError', () => {
    it('should handle UnauthorizedRequestorError with legacy string constructor', () => {
      const err = new UnauthorizedRequestorError('requestor@example.com');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AUTHZ_ERROR]')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('user=requestor@example.com')
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UnauthorizedRequestorError',
        message: expect.stringContaining('requestor@example.com'),
        code: 'UNAUTHORIZED_REQUESTOR',
        status: 403,
      });
    });

    it('should handle UnauthorizedRequestorError with full options', () => {
      const err = new UnauthorizedRequestorError({
        requestorEmail: 'user@example.com',
        requiredRole: 'REQUESTOR',
        actualRoles: ['ADJUDICATOR'],
      });
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AUTHZ_ERROR]')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('user=user@example.com')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('required_role=REQUESTOR')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('actual_roles=["ADJUDICATOR"]')
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UnauthorizedRequestorError',
        message: expect.stringContaining('user@example.com'),
        code: 'UNAUTHORIZED_REQUESTOR',
        status: 403,
      });
    });

    it('should handle UnauthorizedRequestorError without optional role information', () => {
      const err = new UnauthorizedRequestorError({
        requestorEmail: 'noauth@example.com',
      });
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AUTHZ_ERROR]')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('user=noauth@example.com')
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UnauthorizedRequestorError',
        message: expect.stringContaining('noauth@example.com'),
        code: 'UNAUTHORIZED_REQUESTOR',
        status: 403,
      });
    });

    it('should verify UnauthorizedRequestorError instanceof UnauthorizedUserError', () => {
      const err = new UnauthorizedRequestorError({
        requestorEmail: 'test@example.com',
      });

      expect(err).toBeInstanceOf(UnauthorizedUserError);
      expect(err).toBeInstanceOf(UnauthorizedRequestorError);
      expect(err.code).toBe('UNAUTHORIZED_REQUESTOR');
      expect(err.status).toBe(403);
    });
  });

  describe('UnauthorizedUserError', () => {
    it('should handle base UnauthorizedUserError', () => {
      const err = new UnauthorizedUserError('Access denied', {
        userEmail: 'user@example.com',
        requiredRole: 'ADMIN',
        actualRoles: ['USER'],
      });
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AUTHZ_ERROR]')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('user=user@example.com')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('required_role=ADMIN')
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'UnauthorizedUserError',
        message: 'Access denied',
        code: 'UNAUTHORIZED_USER',
        status: 403,
      });
    });
  });
});

  describe('AuthenticationError', () => {
    it('should handle AuthenticationError.missingToken() with 401 status', () => {
      const err = AuthenticationError.missingToken('/api/requests', 'POST', '192.168.1.1');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=MISSING_TOKEN')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('path=/api/requests')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('method=POST')
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: 'Authentication required: missing bearer token',
        code: 'MISSING_TOKEN',
        status: 401,
      });
    });

    it('should handle AuthenticationError.expired() with token details', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiration = now - 3600; // expired 1 hour ago
      const err = AuthenticationError.expired('user@example.com', expiration, now, 'abc123hash');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=TOKEN_EXPIRED')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('tokenHash=abc123hash')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('sub=user@example.com')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`exp=${expiration}`)
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: expect.stringContaining('Token expired'),
        code: 'TOKEN_EXPIRED',
        status: 401,
      });
    });

    it('should handle AuthenticationError.notYetValid() with nbf details', () => {
      const now = Math.floor(Date.now() / 1000);
      const notBefore = now + 3600; // valid 1 hour from now
      const err = AuthenticationError.notYetValid('user@example.com', notBefore, now, 'xyz789hash');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=TOKEN_NOT_YET_VALID')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('tokenHash=xyz789hash')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`nbf=${notBefore}`)
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: expect.stringContaining('Token not valid before'),
        code: 'TOKEN_NOT_YET_VALID',
        status: 401,
      });
    });

    it('should handle AuthenticationError.inactive() for introspection failure', () => {
      const err = AuthenticationError.inactive('user@example.com', '/api/requests', 'token123');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=TOKEN_INACTIVE')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('sub=user@example.com')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('path=/api/requests')
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: 'Token is inactive',
        code: 'TOKEN_INACTIVE',
        status: 401,
      });
    });

    it('should handle AuthenticationError.invalidIssuer() with 403 status', () => {
      const err = AuthenticationError.invalidIssuer(
        'user@example.com',
        'https://wrong.issuer.com',
        'https://expected.issuer.com',
        'hash456'
      );
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=INVALID_ISSUER')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('iss=https://wrong.issuer.com')
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: expect.stringContaining('Invalid token issuer'),
        code: 'INVALID_ISSUER',
        status: 403,
      });
    });

    it('should handle AuthenticationError.invalidAudience() with 403 status', () => {
      const err = AuthenticationError.invalidAudience(
        'user@example.com',
        ['aud1', 'aud2'],
        'expected-audience',
        'hash789'
      );
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=INVALID_AUDIENCE')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('aud=["aud1","aud2"]')
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: expect.stringContaining('Invalid token audience'),
        code: 'INVALID_AUDIENCE',
        status: 403,
      });
    });

    it('should handle AuthenticationError.introspectionFailed() with HTTP details', () => {
      const err = AuthenticationError.introspectionFailed(
        500,
        'Internal Server Error',
        '/api/requests',
        'failhash'
      );
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=INTROSPECTION_FAILED')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('details=')
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: expect.stringContaining('Keycloak introspection request failed'),
        code: 'INTROSPECTION_FAILED',
        status: 401,
      });
    });

    it('should handle AuthenticationError.introspectionError() with 500 status', () => {
      const cause = new Error('Network failure');
      const err = AuthenticationError.introspectionError(cause, '/api/requests', 'GET', 'errhash');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=INTROSPECTION_ERROR')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('path=/api/requests')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('method=GET')
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: 'Token introspection error',
        code: 'INTROSPECTION_ERROR',
        status: 500,
      });
    });

    it('should handle AuthenticationError.internalError() with 500 status', () => {
      const err = AuthenticationError.internalError(
        'Cache initialization failed',
        '/api/requests',
        'POST'
      );
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=INTERNAL_ERROR')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('message="Internal authentication error')
      );
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: expect.stringContaining('Internal authentication error'),
        code: 'INTERNAL_ERROR',
        status: 500,
      });
    });

    it('should handle AuthenticationError.invalidFormat()', () => {
      const err = AuthenticationError.invalidFormat('badhash', '/api/requests', 'POST');
      errorHandler(err, mockReq, mockRes, mockNext);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_ERROR]')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('code=INVALID_TOKEN_FORMAT')
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('tokenHash=badhash')
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'AuthenticationError',
        message: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT',
        status: 401,
      });
    });
  });
