jest.mock('../../../../rdbms/entities/UseCaseRequest', () => {
  class UseCaseRequest {
    static findAll = jest.fn();
  }
  return { UseCaseRequest };
});

jest.mock('../../../../rdbms/entities/MarketplaceUser', () => ({ MarketplaceUser: class MarketplaceUser {} }));
jest.mock('../../../../rdbms/entities/Status', () => ({ Status: class Status {} }));

import { UseCaseRequest } from '../../../../rdbms/entities/UseCaseRequest';
import { MarketplaceUser } from '../../../../rdbms/entities/MarketplaceUser';
import { Status } from '../../../../rdbms/entities/Status';
import { UseCaseRequestDAO } from '../../../../rdbms/dao/UseCaseRequestDAO';

describe('UseCaseRequestDAO', () => {
  const dao = new UseCaseRequestDAO();

  beforeEach(() => {
    (UseCaseRequest.findAll as any).mockReset?.();
  });

  test('listByRequestor includes requestor + status', async () => {
    (UseCaseRequest.findAll as any).mockResolvedValue([{ id: 1 }]);
    const res = await dao.listByRequestor(7);
    expect(UseCaseRequest.findAll).toHaveBeenCalledWith({
      where: { requestor_id: 7 } as any,
      include: [
        { model: MarketplaceUser, as: 'requestor' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
    expect(res).toEqual([{ id: 1 }]);
  });
});
