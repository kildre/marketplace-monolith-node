// ---- Mocks ----
jest.mock('../../../../rdbms/entities/Decision', () => {
  class Decision {
    static create = jest.fn();
    static findAll = jest.fn();
    static findByPk = jest.fn();
    update = jest.fn();
  }
  return { Decision };
});

jest.mock('../../../../main/rdbms/entities/MarketplaceUser', () => ({
  MarketplaceUser: class MarketplaceUser {}
}));

jest.mock('../../../../main/rdbms/entities/UseCaseRequest', () => ({
  UseCaseRequest: class UseCaseRequest {}
}));

jest.mock('../../../../main/rdbms/entities/MarketplaceOrder', () => ({
  MarketplaceOrder: class MarketplaceOrder {}
}));

jest.mock('../../../../main/rdbms/entities/Status', () => ({
  Status: class Status {}
}));

// ---- Imports ----
import { Decision } from '../../../../main/rdbms/entities/Decision';
import { MarketplaceUser } from '../../../../main/rdbms/entities/MarketplaceUser';
import { Status } from '../../../../main/rdbms/entities/Status';
import { DecisionDAO } from '../../../../main/rdbms/dao/DecisionDAO';

// ---- Tests ----
describe('DecisionDAO', () => {
  const dao = new DecisionDAO();

  beforeEach(() => {
    (Decision.create as any).mockReset?.();
    (Decision.findAll as any).mockReset?.();
    (Decision.findByPk as any).mockReset?.();
  });

  test('createForRequest', async () => {
    (Decision.create as any).mockResolvedValue({ id: 1 });
    const res = await dao.createForRequest({ request_id: 22 } as any);
    expect(Decision.create).toHaveBeenCalledWith({ request_id: 22 }, { transaction: undefined });
    expect(res).toEqual({ id: 1 });
  });

  test('listForRequest includes adjudicator + status', async () => {
    (Decision.findAll as any).mockResolvedValue([{ id: 2 }]);
    const res = await dao.listForRequest(22);
    expect(Decision.findAll).toHaveBeenCalledWith({
      where: { request_id: 22 } as any,
      include: [
        { model: MarketplaceUser, as: 'adjudicator' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
    expect(res).toEqual([{ id: 2 }]);
  });

  test('listForOrder includes adjudicator + status', async () => {
    (Decision.findAll as any).mockResolvedValue([{ id: 3 }]);
    const res = await dao.listForOrder(9);
    expect(Decision.findAll).toHaveBeenCalledWith({
      where: { order_id: 9 } as any,
      include: [
        { model: MarketplaceUser, as: 'adjudicator' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
    expect(res).toEqual([{ id: 3 }]);
  });

  test('updateStatus updates when found', async () => {
    const instance: any = new (Decision as any)();
    instance.update = jest.fn().mockResolvedValue(null);
    (Decision.findByPk as any).mockResolvedValue(instance);

    const updated = await dao.updateStatus(9, 3);
    expect(Decision.findByPk).toHaveBeenCalledWith(9, { transaction: undefined });
    expect(instance.update).toHaveBeenCalledWith({ status_id: 3 }, { transaction: undefined });
    expect(updated).toBe(instance);
  });

  test('updateStatus returns null if not found', async () => {
    (Decision.findByPk as any).mockResolvedValue(null);
    const res = await dao.updateStatus(9, 3);
    expect(res).toBeNull();
  });
});
