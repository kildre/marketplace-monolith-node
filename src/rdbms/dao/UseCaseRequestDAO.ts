import { BaseDAO } from './BaseDAO';
import { UseCaseRequest } from '../entities/UseCaseRequest';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { Status } from '../entities/Status';

export class UseCaseRequestDAO extends BaseDAO<UseCaseRequest> {
  constructor() {
    super(UseCaseRequest);
  }

  async listByRequestor(requestorId: number): Promise<UseCaseRequest[]> {
    return UseCaseRequest.findAll({
      where: { requestor_id: requestorId } as any,
      include: [
        { model: MarketplaceUser, as: 'requestor' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
  }
}
