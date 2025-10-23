import { errorHandler } from '../../../main/middleware/errorHandler';
import ErrorDto from '../../../main/web/dtos/ErrorDto';
import ConstraintError from '../../../main/domain/errors/ConstraintError';
import { ValidationError } from 'class-validator';

// Mocks
const mockReq = {} as any;
const mockRes = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
} as any;
const mockNext = jest.fn();

jest.mock('../../../main/service/loggingService', () => ({
  error: jest.fn(),
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
});
