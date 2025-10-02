// src/test/unit/rdbms/dao/UseCaseRequestDAO.unit.test.ts

// ---- Mocks ----
jest.mock('../../../../main/rdbms/entities/UseCaseRequest', () => {
  class UseCaseRequest {
    static findAll = jest.fn();
    static findOne = jest.fn();
  }
  return { UseCaseRequest };
});

// ---- Imports ----
import { UseCaseRequest } from '../../../../main/rdbms/entities/UseCaseRequest';
import { UseCaseRequestDAO } from '../../../../main/rdbms/dao/UseCaseRequestDAO';

describe('UseCaseRequestDAO (unit)', () => {
  // ✅ attach a stub sequelize so DAO's getter doesn't throw
  beforeAll(() => {
    (UseCaseRequest as any).sequelize = {
      // only what your DAO might read:
      models: {
        MarketplaceUser: {},
        Status: {},
        Decision: {},
        CartItem: {},
        Product: {},
      },
      getQueryInterface: () => ({}),
    };
  });

  const dao = new UseCaseRequestDAO();
  const tx = Symbol('tx') as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----------------- findByStatusId -----------------
  it('findByStatusId forwards where, include, pagination, tx, and findOptions', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([{ id: 1 }]);

    const res = await dao.findByStatusId(2, {
      // pass-through include (no association conversion)
      extraInclude: [{ as: 'requestor' } as any],
      limit: 10,
      offset: 5,
      transaction: tx,
      findOptions: { attributes: ['id'] },
    });

    expect(UseCaseRequest.findAll).toHaveBeenCalledWith({
      where: { status_id: 2 },
      include: [{ as: 'requestor' }],
      limit: 10,
      offset: 5,
      transaction: tx,
      order: [['id', 'DESC']],
      attributes: ['id'],
    });
    expect(res).toEqual([{ id: 1 }]);
  });

  it('findByStatusId works with default options', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([{ id: 2 }]);

    const res = await dao.findByStatusId(3);

    expect(UseCaseRequest.findAll).toHaveBeenCalledWith({
      where: { status_id: 3 },
      include: undefined,
      limit: undefined,
      offset: undefined,
      transaction: undefined,
      order: [['id', 'DESC']],
    });
    expect(res).toEqual([{ id: 2 }]);
  });

  // ----------------- findByRequestorId -----------------
  it('findByRequestorId forwards where, include, pagination, tx, and findOptions', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([{ id: 10 }]);

    const res = await dao.findByRequestorId(7, {
      extraInclude: [{ as: 'status' } as any],
      limit: 25,
      offset: 75,
      transaction: tx,
      findOptions: { attributes: ['id', 'request_number'] },
    });

    expect(UseCaseRequest.findAll).toHaveBeenCalledWith({
      where: { requestor_id: 7 },
      include: [{ as: 'status' }],
      limit: 25,
      offset: 75,
      transaction: tx,
      order: [['id', 'DESC']],
      attributes: ['id', 'request_number'],
    });
    expect(res).toEqual([{ id: 10 }]);
  });

  it('findByRequestorId works with default options', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([{ id: 11 }]);

    const res = await dao.findByRequestorId(9);

    expect(UseCaseRequest.findAll).toHaveBeenCalledWith({
      where: { requestor_id: 9 },
      include: undefined,
      limit: undefined,
      offset: undefined,
      transaction: undefined,
      order: [['id', 'DESC']],
    });
    expect(res).toEqual([{ id: 11 }]);
  });

  // ----------------- findByRequestNumber -----------------
  it('findByRequestNumber forwards where, include, tx, and findOptions', async () => {
    (UseCaseRequest.findOne as any).mockResolvedValue({
      id: 99,
      request_number: 'REQ-42',
    });

    const res = await dao.findByRequestNumber('REQ-42', {
      extraInclude: [{ as: 'requestor' } as any], // DAO adds full graph & converts to association
      transaction: tx,
      findOptions: { attributes: ['id', 'request_number'] },
    });

    expect(UseCaseRequest.findOne).toHaveBeenCalledWith({
      where: { requestNumber: 'REQ-42' },         // 👈 camelCase attribute
      include: [                                  // 👈 full include graph via associations
        { association: 'requestor' },
        { association: 'status' },
        {
          association: 'cartItems',
          required: false,
          include: [{ association: 'product' }],
        },
        {
          association: 'decisions',
          required: false,
          include: [{ association: 'status' }, { association: 'adjudicator' }],
        },
      ],
      transaction: tx,
      raw: false,
      attributes: ['id', 'request_number'],
    });
    expect(res).toEqual({ id: 99, request_number: 'REQ-42' });
  });

  it('findByRequestNumber works with default options and can return null', async () => {
    (UseCaseRequest.findOne as any).mockResolvedValue(null);

    const res = await dao.findByRequestNumber('REQ-404');

    expect(UseCaseRequest.findOne).toHaveBeenCalledWith({
      where: { requestNumber: 'REQ-404' },        // 👈 camelCase attribute
      include: [                                  // 👈 DAO injects full include graph by default
        { association: 'requestor' },
        { association: 'status' },
        {
          association: 'cartItems',
          required: false,
          include: [{ association: 'product' }],
        },
        {
          association: 'decisions',
          required: false,
          include: [{ association: 'status' }, { association: 'adjudicator' }],
        },
      ],
      transaction: undefined,
      raw: false,
    });
    expect(res).toBeNull();
  });
});
