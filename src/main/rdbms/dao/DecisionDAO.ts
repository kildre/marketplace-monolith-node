import { Transaction } from 'sequelize';
import { BaseDAO } from './BaseDAO';
import { Decision } from '../entities/Decision';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { Status } from '../entities/Status';

export class DecisionDAO extends BaseDAO<Decision> {
  constructor() {
    super(Decision);
  }

  async createForRequest(
    decisionData: Partial<Decision>,
    tx?: Transaction
  ): Promise<Decision> {
    return Decision.create(decisionData as any, { transaction: tx });
  }

  async listForRequest(requestId: number): Promise<Decision[]> {
    return Decision.findAll({
      where: { request_id: requestId } as any,
      include: [
        { model: MarketplaceUser, as: 'adjudicator' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
  }

  async listForOrder(orderId: number): Promise<Decision[]> {
    return Decision.findAll({
      where: { order_id: orderId } as any,
      include: [
        { model: MarketplaceUser, as: 'adjudicator' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
  }

  async updateStatus(decisionId: number, statusId: number, tx?: Transaction): Promise<Decision | null> {
    const decision = await Decision.findByPk(decisionId, { transaction: tx });
    if (!decision) return null;
    await decision.update({ status_id: statusId } as any, { transaction: tx });
    return decision;
  }
}
