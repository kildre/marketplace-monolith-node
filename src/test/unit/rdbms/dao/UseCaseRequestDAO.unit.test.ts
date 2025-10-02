// ---- Mocks ----
jest.mock('../../../../main/rdbms/entities/UseCaseRequest', () => {
  class UseCaseRequest {
    static findAll = jest.fn();
    static findOne = jest.fn();
    static sequelize?: any; // we'll attach a fake sequelize in tests
  }
  return { UseCaseRequest };
});

// ---- Imports under test ----
import { UseCaseRequestDAO } from '../../../../main/rdbms/dao/UseCaseRequestDAO';
import { UseCaseRequest } from '../../../../main/rdbms/entities/UseCaseRequest';

describe('UseCaseRequestDAO (unit)', () => {
  let dao: UseCaseRequestDAO;

  // Fake “sequelize” and associated model classes to satisfy buildIncludes()
  class MarketplaceUser {}
  class Status {}
  class Decision {}
  class CartItem {}
  class Product {}

  const tx = Symbol('tx') as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Provide the minimal shape that UseCaseRequestDAO expects:
    (UseCaseRequest as any).sequelize = {
      // Only models are accessed by the DAO
      models: { MarketplaceUser, Status, Decision, CartItem, Product },
    };

    dao = new UseCaseRequestDAO();
  });

  // ------------- findAllRequests -------------
  it('findAllRequests: no flags -> include is undefined; passes limit/offset/order/tx/findOptions', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([{ id: 1 }]);

    const res = await dao.findAllRequests({
      limit: 25,
      offset: 100,
      transaction: tx,
      findOptions: { attributes: ['id'], paranoid: false },
    });

    expect(UseCaseRequest.findAll).toHaveBeenCalledWith({
      include: undefined,
      limit: 25,
      offset: 100,
      transaction: tx,
      order: [['id', 'DESC']],
      attributes: ['id'],
      paranoid: false,
    });
    expect(res).toEqual([{ id: 1 }]);
  });

  it('findAllRequests: all include flags true + extraInclude are combined', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([]);

    const extra = [{ association: 'someExtra' }] as any;

    await dao.findAllRequests({
      includeRequestor: true,
      includeStatus: true,
      includeDecisions: true,
      includeCartItems: true,
      extraInclude: extra,
    });

    // Capture the call to verify includes structure
    const arg = (UseCaseRequest.findAll as any).mock.calls[0][0];
    expect(arg.include).toEqual(
      expect.arrayContaining([
        { model: MarketplaceUser, as: 'requestor' },
        { model: Status, as: 'status' },
        expect.objectContaining({
          model: Decision,
          as: 'decisions',
          required: false,
          include: [{ model: Status, as: 'status' }],
        }),
        expect.objectContaining({
          model: CartItem,
          as: 'cartItems',
          include: [{ model: Product, as: 'product' }],
        }),
        { association: 'someExtra' },
      ])
    );
  });

  // ------------- findByStatusId -------------
  it('findByStatusId: uses snake_case status_id in where + merges options', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([{ id: 3 }]);

    const res = await dao.findByStatusId(9, {
      includeRequestor: true,
      limit: 5,
      offset: 10,
      transaction: tx,
      findOptions: { attributes: ['id'] },
    });

    expect(UseCaseRequest.findAll).toHaveBeenCalledWith({
      where: { status_id: 9 },
      include: [{ model: MarketplaceUser, as: 'requestor' }],
      limit: 5,
      offset: 10,
      transaction: tx,
      order: [['id', 'DESC']],
      attributes: ['id'],
    });
    expect(res).toEqual([{ id: 3 }]);
  });

  // ------------- findByRequestorId -------------
  it('findByRequestorId: uses snake_case requestor_id in where + merges options', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([{ id: 4 }]);

    const res = await dao.findByRequestorId(77, {
      includeStatus: true,
      transaction: tx,
    });

    expect(UseCaseRequest.findAll).toHaveBeenCalledWith({
      where: { requestor_id: 77 },
      include: [{ model: Status, as: 'status' }],
      limit: undefined,
      offset: undefined,
      transaction: tx,
      order: [['id', 'DESC']],
    });
    expect(res).toEqual([{ id: 4 }]);
  });

  // ------------- findByRequestNumber -------------
  it('findByRequestNumber: uses full includes, passes raw:false, spreads findOptions and transaction', async () => {
    const row = { id: 10, requestNumber: 'REQ-XYZ' };
    (UseCaseRequest.findOne as any).mockResolvedValue(row);

    const res = await dao.findByRequestNumber('REQ-XYZ', {
      transaction: tx,
      findOptions: { attributes: ['id', 'requestNumber'] },
    });

    // First ensure findOne called with proper where/transaction/raw/etc.
    const callArg = (UseCaseRequest.findOne as any).mock.calls[0][0];
    expect(callArg.where).toEqual({ requestNumber: 'REQ-XYZ' });
    expect(callArg.transaction).toBe(tx);
    expect(callArg.raw).toBe(false);
    expect(callArg.attributes).toEqual(['id', 'requestNumber']);

    // And includes equal the fullIncludes() structure
    expect(callArg.include).toEqual(
      expect.arrayContaining([
        { association: 'requestor' },
        { association: 'status' },
        expect.objectContaining({
          association: 'cartItems',
          required: false,
          include: [{ association: 'product' }],
        }),
        expect.objectContaining({
          association: 'decisions',
          required: false,
          include: [
            { association: 'status' },
            { association: 'adjudicator' },
          ],
        }),
      ])
    );

    expect(res).toBe(row);
  });

  it('findByRequestNumber: works without transaction and without findOptions', async () => {
    (UseCaseRequest.findOne as any).mockResolvedValue(null);

    await dao.findByRequestNumber('REQ-123');

    const arg = (UseCaseRequest.findOne as any).mock.calls[0][0];
    expect(arg.transaction).toBeUndefined();
    expect(arg.raw).toBe(false);
    expect(arg.findOptions).toBeUndefined();
    expect(arg.include).toBeDefined(); // still uses fullIncludes()
  });

  it('findByRequestNumber: fullIncludes returns a fresh array each call (no shared mutations)', async () => {
    (UseCaseRequest.findOne as any).mockResolvedValue(null);

    await dao.findByRequestNumber('ONE');
    const firstInclude = (UseCaseRequest.findOne as any).mock.calls[0][0].include;

    await dao.findByRequestNumber('TWO');
    const secondInclude = (UseCaseRequest.findOne as any).mock.calls[1][0].include;

    // not the same reference
    expect(firstInclude).not.toBe(secondInclude);
    // but same shape
    expect(firstInclude).toEqual(secondInclude);
  });

  // ------------- buildIncludes: branch coverage -------------
  it('buildIncludes: returns undefined when no flags and no extra', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([]);
    await dao.findAllRequests({});
    const include = (UseCaseRequest.findAll as any).mock.calls[0][0].include;
    expect(include).toBeUndefined();
  });

  it('buildIncludes: combines chosen flags + extraInclude', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([]);
    await dao.findAllRequests({
      includeRequestor: true,
      includeDecisions: true,
      extraInclude: [{ association: 'foo' }] as any,
    });
    const include = (UseCaseRequest.findAll as any).mock.calls[0][0].include;

    expect(include).toEqual(
      expect.arrayContaining([
        { model: MarketplaceUser, as: 'requestor' },
        expect.objectContaining({
          model: Decision,
          as: 'decisions',
          required: false,
          include: [{ model: Status, as: 'status' }],
        }),
        { association: 'foo' },
      ])
    );
  });

  // ------------- Error branch when model.sequelize is missing -------------
  it('throws a clear error if model.sequelize is not bound', async () => {
    // Remove the fake sequelize so dao.sequelize throws when buildIncludes tries to access it
    (UseCaseRequest as any).sequelize = undefined;

    // Use a call path that requires buildIncludes (so it touches dao.sequelize)
    await expect(
      dao.findAllRequests({ includeStatus: true })
    ).rejects.toThrow(/is not bound to a Sequelize instance/i);
  });
});
