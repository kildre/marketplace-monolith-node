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
      // ✅ attribute name
      where: { requestId } as any,
      include: [
        { model: MarketplaceUser, as: 'adjudicator' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
  }

  async listForOrder(orderId: number): Promise<Decision[]> {
    return Decision.findAll({
      // ✅ attribute name
      where: { orderId } as any,
      include: [
        { model: MarketplaceUser, as: 'adjudicator' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
    });
  }

  // src/rdbms/dao/DecisionDAO.ts
  async updateStatus(decisionId: number, statusId: number, tx?: Transaction): Promise<Decision | null> {
    const decision = await Decision.findByPk(decisionId, { transaction: tx });
    if (!decision) return null;

    await decision.update({ statusId }, { transaction: tx });

    // optional but safer for callers that expect fresh values (and eager loads later)
    await decision.reload({ transaction: tx });
    return decision;
  }
}
