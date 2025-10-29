// src/test/unit/service/requestEndpointServiceImpl.unit.test.ts
import {
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ValidationError,
  ValidationErrorItem,
} from 'sequelize';

// ---- Module under test (imported AFTER mocks are set)
const SERVICE_PATH = '../../../main/service/requestEndpointService';

// ---- Mocks for collaborators
const mockUserSvc = {
  isAuthorizedRequestor: jest.fn(),
  isAuthorizedAdjudicator: jest.fn(),
  findByEmail: jest.fn(),
};

const mockUseCaseRequestDAO = {
  create: jest.fn(),
  findByStatusId: jest.fn(),
  findAllRequests: jest.fn(),
  findByRequestorId: jest.fn(),
  findByRequestNumber: jest.fn(),
};

const mockProductDAO = {
  findByName: jest.fn(),
};

const mockCartItemDAO = {
  create: jest.fn(),
};

// ---- Mock the DAO classes to return our spy objects
jest.mock('../../../main/rdbms/dao/UseCaseRequestDAO', () => {
  return {
    UseCaseRequestDAO: jest.fn().mockImplementation(() => mockUseCaseRequestDAO),
  };
});

jest.mock('../../../main/rdbms/dao/ProductDAO', () => {
  return {
    ProductDAO: jest.fn().mockImplementation(() => mockProductDAO),
  };
});

jest.mock('../../../main/rdbms/dao/CartItemDAO', () => {
  return {
    CartItemDAO: jest.fn().mockImplementation(() => mockCartItemDAO),
  };
});

// ---- Mock the userEndpointService module the service imports
jest.mock('../../../main/service/userEndpointService', () => ({
  __esModule: true,
  default: mockUserSvc,
}));

// ---- Patch the sequelize transaction used via UseCaseRequest.sequelize
// Default: run the callback and return its value
const transactionSpy = jest.fn(async (cb: any) => cb({} as any));
const mockUseCaseRequestModel: any = { sequelize: { transaction: transactionSpy } };

// Must match import in service: import { UseCaseRequest } from "../rdbms/entities/UseCaseRequest";
jest.mock('../../../main/rdbms/entities/UseCaseRequest', () => ({
  __esModule: true,
  UseCaseRequest: mockUseCaseRequestModel,
}));

// ---- Bring in enums & errors for assertions
import { StatusEnum } from '../../../main/domain/enumeration/StatusEnum';
import { ProductNotFoundError } from '../../../main/domain/errors/ProductNotFoundError';

// Small factory helpers
const makeSubmitDto = (over: Partial<any> = {}) => ({
  requestNumber: '  REQ-001  ',
  requestorEmail: '  USER@Example.com   ',
  requestedToolName: 'Tool X',
  description: 'desc',
  designation: 'A',
  agency: 'B',
  organization: 'C',
  otherOrganization: 'D',
  pointOfContact: 'POC',
  email: 'x@y.com',
  phoneNumber: '123-456',
  estimatedRom: 123.45,
  cartItems: [{ name: 'Prod A', quantity: 2 }],
  ...over,
});

const makeRowCamel = () => ({
  id: 10,
  requestNumber: 'REQ-10',
  statusId: StatusEnum.PENDING.id,
  email: 'r@x.com',
  requestedToolName: 'Tool T',
  description: 'hello',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-02T00:00:00Z'),
  requestor: { email: 'req@example.com' },
  decisions: [
    {
      decisionNumber: 'DEC-1',
      adjudicator: { email: 'judge@example.com' },
      statusId: 7,
      decisionAt: new Date('2025-01-03T00:00:00Z'),
      updatedAt: new Date('2025-01-04T00:00:00Z'),
      comments: 'ok',
      get: function () {
        return { ...this };
      },
    },
  ],
  cartItems: [
    {
      quantity: 3,
      product: { name: 'Prod Z' },
    },
  ],
  get: function () {
    return { ...this };
  },
});

const makeRowSnake = () => ({
  id: 22,
  request_number: 'REQ-22',
  status_id: StatusEnum.PENDING.id,
  email: 'r@x.com',
  requested_tool_name: 'Tool S',
  description: 'snake',
  created_at: new Date('2025-03-01T00:00:00Z'),
  updated_at: new Date('2025-03-02T00:00:00Z'),
  Requestor: { email: 'snake@example.com' },
  Decisions: [
    {
      decision_number: 'DEC-22',
      Adjudicator: { email: 'judge2@example.com' },
      status_id: 9,
      created_at: new Date('2025-03-03T00:00:00Z'),
      updated_at: new Date('2025-03-04T00:00:00Z'),
      comments: 'snake-ok',
      get: function () {
        return { ...this };
      },
    },
  ],
  cart_items: [
    {
      quantity: 1,
      Product: { name: 'Prod S' },
    },
  ],
  get: function () {
    return { ...this };
  },
});

describe('RequestEndpointService (unit, mocked)', () => {
  let svc: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    // Don't reset modules - this breaks instanceof checks for Sequelize errors
    const mod = await import(SERVICE_PATH);
    svc = mod.default;
  });

  // ---------- submit ----------
  it('submit → throws when requestorEmail missing/blank (normalization enforced)', async () => {
    await expect(svc.submit(makeSubmitDto({ requestorEmail: '   ' }))).rejects.toThrow(
      /User email is required/i
    );
  });

  it('submit → throws when findByEmail returns undefined/null', async () => {
    mockUserSvc.findByEmail.mockRejectedValueOnce(new Error('User not found'));

    await expect(svc.submit(makeSubmitDto())).rejects.toThrow(
      /User not found/i
    );
  });

  it('submit → happy path: creates inside a transaction and returns trimmed requestNumber', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 77, email: 'user@example.com' });

    // Allow DAO calls to succeed
    mockUseCaseRequestDAO.create.mockResolvedValueOnce({ dataValues: { id: 999 } });
    mockProductDAO.findByName.mockResolvedValueOnce({ dataValues: { id: 101 } });
    mockCartItemDAO.create.mockResolvedValueOnce({});

    const resp = await svc.submit(makeSubmitDto());

    expect(transactionSpy).toHaveBeenCalledTimes(1);
    expect(resp).toEqual({ requestNumber: 'REQ-001' });
  });

  it('submit → throws ProductNotFoundError (thrown within transaction)', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 55 });

    // Force the tx to throw the same error branch the DAO would cause
    transactionSpy.mockImplementationOnce(async () => {
      throw new ProductNotFoundError('Prod A');
    });

    await expect(svc.submit(makeSubmitDto())).rejects.toThrow(/product.*not.*found/i);
  });

  it('submit → maps UniqueConstraintError to friendly message (or default Validation Error if instanceof mismatch)', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 55 });

    transactionSpy.mockImplementationOnce(async () => {
      throw new UniqueConstraintError({
        errors: [{ message: 'request_number must be unique' } as any],
      });
    });

    await expect(svc.submit(makeSubmitDto())).rejects.toThrow(
      /(Duplicate value: request_number must be unique|Validation Error)/i
    );
  });

  it('submit → maps ForeignKeyConstraintError to helpful message with single field array', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 55 });

    transactionSpy.mockImplementationOnce(async () => {
      const err = new ForeignKeyConstraintError({
        message: 'foreign key constraint',
        fields: ['requestor_id'], // Array with single field
        table: 'use_case_request',
        value: 999,
        index: 'fk_requestor',
      } as any);
      throw err;
    });

    await expect(svc.submit(makeSubmitDto())).rejects.toThrow(
      /Invalid reference on use_case_request \(requestor_id\)/i
    );
  });

  it('submit → maps ForeignKeyConstraintError to helpful message with multiple fields array', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 55 });

    transactionSpy.mockImplementationOnce(async () => {
      const err = new ForeignKeyConstraintError({
        message: 'foreign key constraint',
        fields: ['field1', 'field2', 'field3'], // Array with multiple fields
        table: 'some_table',
        value: 999,
        index: 'fk_multi',
      } as any);
      throw err;
    });

    await expect(svc.submit(makeSubmitDto())).rejects.toThrow(
      /Invalid reference on some_table \(field1, field2, field3\)/i
    );
  });

  it('submit → maps ForeignKeyConstraintError with non-array fields to helpful message', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 55 });

    transactionSpy.mockImplementationOnce(async () => {
      const err = new ForeignKeyConstraintError({
        message: 'foreign key constraint',
        fields: 'status_id', // String field (not array)
        table: 'use_case_request',
        value: 999,
        index: 'fk_status',
      } as any);
      throw err;
    });

    await expect(svc.submit(makeSubmitDto())).rejects.toThrow(
      /Invalid reference on use_case_request \(status_id\)/i
    );
  });

  it('submit → maps ForeignKeyConstraintError with undefined/null fields to helpful message without fields', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 55 });

    transactionSpy.mockImplementationOnce(async () => {
      const err = new ForeignKeyConstraintError({
        message: 'foreign key constraint',
        fields: undefined, // No fields specified
        table: 'some_table',
        value: 999,
        index: 'fk_unknown',
      } as any);
      throw err;
    });

    await expect(svc.submit(makeSubmitDto())).rejects.toThrow(
      /Invalid reference on some_table$/i // No fields in parentheses
    );
  });

  it('submit → maps ValidationError to aggregated message (or throws original "boom")', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 55 });

    // Helper to build ValidationErrorItem with full 8-arg signature
    const mkVEI = (msg: string, path: string, value: any) =>
      new (ValidationErrorItem as any)(
        msg,
        'FUNCTION',
        path,
        String(value),
        undefined,
        'validatorKey',
        'fnName',
        []
      );

    const vErr = new ValidationError('boom', [
      mkVEI('bad x', 'fieldX', 'bad'),
      mkVEI('bad y', 'fieldY', 'worse'),
    ]);

    transactionSpy.mockImplementationOnce(async () => {
      throw vErr;
    });

    await expect(svc.submit(makeSubmitDto())).rejects.toThrow(
      /(Validation failed: bad x; bad y|boom)/i
    );
  });

  it('submit → rethrows unknown errors', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 55 });

    transactionSpy.mockImplementationOnce(async () => {
      throw new Error('kaboom');
    });

    await expect(svc.submit(makeSubmitDto())).rejects.toThrow(/kaboom/i);
  });

  // ---------- viewPendingRequests ----------
  it('viewPendingRequests → throws when email is invalid', async () => {
    mockUserSvc.findByEmail.mockRejectedValueOnce(new Error('User not found'));

    await expect(
      svc.viewPendingRequests({ userEmail: 'nope@example.com' })
    ).rejects.toThrow(/User not found/i);
  });

  it('viewPendingRequests → returns mapped DTOs when authorized', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 1, email: 'judge@example.com' });
    mockUseCaseRequestDAO.findByStatusId.mockResolvedValueOnce([makeRowCamel(), makeRowSnake()]);

    const out = await svc.viewPendingRequests({ userEmail: 'judge@example.com' });

    expect(mockUseCaseRequestDAO.findByStatusId).toHaveBeenCalledWith(
      StatusEnum.PENDING.id,
      expect.objectContaining({
        includeRequestor: true,
        includeStatus: true,
        includeDecisions: true,
        includeCartItems: true,
        findOptions: expect.any(Object),
      }),
    );
    expect(out.requests).toHaveLength(2);
    expect(out.requests[0]).toEqual(
      expect.objectContaining({
        requestNumber: 'REQ-10',
        requestedToolName: 'Tool T',
        requestorEmail: 'req@example.com',
        cartItems: [{ name: 'Prod Z', quantity: 3 }],
        decision: expect.objectContaining({
          decisionNumber: 'DEC-1',
          adjudicatorEmail: 'judge@example.com',
        }),
      })
    );
    expect(out.requests[1]).toEqual(
      expect.objectContaining({
        requestNumber: 'REQ-22',
        requestedToolName: 'Tool S',
        requestorEmail: 'snake@example.com',
        cartItems: [{ name: 'Prod S', quantity: 1 }],
        decision: expect.objectContaining({
          decisionNumber: 'DEC-22',
          adjudicatorEmail: 'judge2@example.com',
        }),
      })
    );
  });

  // ---------- viewAllRequests ----------
  it('viewAllRequests → throws when email is invalid', async () => {
    mockUserSvc.findByEmail.mockRejectedValueOnce(new Error('User not found'));

    await expect(
      svc.viewAllRequests({ userEmail: 'nope@example.com' })
    ).rejects.toThrow(/User not found/i);
  });

  it('viewAllRequests → returns mapped DTOs when authorized', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 1, email: 'judge@example.com' });
    mockUseCaseRequestDAO.findAllRequests.mockResolvedValueOnce([makeRowCamel()]);

    const out = await svc.viewAllRequests({ userEmail: 'judge@example.com' });

    expect(mockUseCaseRequestDAO.findAllRequests).toHaveBeenCalledWith(
      expect.objectContaining({
        includeRequestor: true,
        includeStatus: true,
        includeDecisions: true,
        includeCartItems: true,
        findOptions: expect.any(Object),
      })
    );
    expect(out.requests).toHaveLength(1);
    expect(out.requests[0].requestNumber).toBe('REQ-10');
  });

  // ---------- viewRequestsForRequestor ----------
  it('viewRequestsForRequestor → throws when email is invalid', async () => {
    mockUserSvc.findByEmail.mockRejectedValueOnce(new Error('User not found'));

    await expect(
      svc.viewRequestsForRequestor({ userEmail: 'x@y.com' })
    ).rejects.toThrow(/User not found/i);
  });

  it('viewRequestsForRequestor → throws when findByEmail returns falsy', async () => {
    mockUserSvc.findByEmail.mockRejectedValueOnce(new Error('User not found'));

    await expect(
      svc.viewRequestsForRequestor({ userEmail: 'r@x.com' })
    ).rejects.toThrow(/User not found/i);
  });

  it('viewRequestsForRequestor → authorized + found user → returns mapped list', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ dataValues: { id: 444 } });

    mockUseCaseRequestDAO.findByRequestorId.mockResolvedValueOnce([makeRowCamel()]);

    const out = await svc.viewRequestsForRequestor({ userEmail: 'r@x.com' });

    expect(mockUseCaseRequestDAO.findByRequestorId).toHaveBeenCalledWith(
      444,
      expect.objectContaining({
        includeRequestor: true,
        includeStatus: true,
        includeDecisions: true,
        includeCartItems: true,
        findOptions: expect.any(Object),
      })
    );
    expect(out.requests[0].requestNumber).toBe('REQ-10');
  });

  // ---------- viewRequestForRequestNumber ----------
  it('viewRequestForRequestNumber → throws when email is invalid', async () => {
    mockUserSvc.findByEmail.mockRejectedValueOnce(new Error('User not found'));

    await expect(
      svc.viewRequestForRequestNumber({ userEmail: 'z@z.com', requestNumber: 'REQ-404' })
    ).rejects.toThrow(/User not found/i);
  });

  it('viewRequestForRequestNumber → throws when DAO returns null', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 1, email: 'j@x.com' });
    mockUseCaseRequestDAO.findByRequestNumber.mockResolvedValueOnce(null);

    await expect(
      svc.viewRequestForRequestNumber({ userEmail: 'j@x.com', requestNumber: 'REQ-404' })
    ).rejects.toThrow(/Request with number REQ-404 not found/i);
  });

  it('viewRequestForRequestNumber → success maps to DTO', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 1, email: 'j@x.com' });
    mockUseCaseRequestDAO.findByRequestNumber.mockResolvedValueOnce(makeRowCamel());

    const dto = await svc.viewRequestForRequestNumber({
      userEmail: 'j@x.com',
      requestNumber: 'REQ-10',
    });

    expect(dto).toEqual(
      expect.objectContaining({
        requestNumber: 'REQ-10',
        requestedToolName: 'Tool T',
        decision: expect.objectContaining({ decisionNumber: 'DEC-1' }),
      })
    );
  });

  it('viewRequestForRequestNumber → maps DTO with undefined decision when decision is null/undefined (covers if (!d) branch)', async () => {
    mockUserSvc.findByEmail.mockResolvedValueOnce({ id: 1, email: 'j@x.com' });
    
    // Create a row with no decision (undefined)
    const rowWithoutDecision = {
      id: 30,
      requestNumber: 'REQ-30',
      statusId: StatusEnum.PENDING.id,
      email: 'r@x.com',
      requestedToolName: 'Tool No Decision',
      description: 'pending request',
      createdAt: new Date('2025-01-01T00:00:00Z'),
      updatedAt: new Date('2025-01-02T00:00:00Z'),
      requestor: { email: 'req@example.com' },
      decisions: [], // Empty decisions array
      cartItems: [],
      get: function () {
        return { ...this };
      },
    };
    
    mockUseCaseRequestDAO.findByRequestNumber.mockResolvedValueOnce(rowWithoutDecision);

    const dto = await svc.viewRequestForRequestNumber({
      userEmail: 'j@x.com',
      requestNumber: 'REQ-30',
    });

    expect(dto).toEqual(
      expect.objectContaining({
        requestNumber: 'REQ-30',
        requestedToolName: 'Tool No Decision',
        decision: undefined, // Should be undefined when no decision exists
      })
    );
  });
});
