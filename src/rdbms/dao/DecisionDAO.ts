// src/dao/DecisionDAO.ts
import {
  Transaction,
  CreationAttributes,
  FindOptions,
} from 'sequelize';
import { sequelize } from '../../config/sequelizeCLIConfig.cjs'; 
import { BaseDAO } from './BaseDAO';
import { Decision } from '../entities/Decision';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { Status } from '../entities/Status';

type WithTx = { transaction?: Transaction };

export class DecisionDAO extends BaseDAO<Decision> {
  constructor() {
    super(Decision);
  }

  /** Internal helper: run in provided tx, or open a managed one */
  private async withTx<T>(
    tx: Transaction | undefined,
    fn: (t: Transaction) => Promise<T>
  ): Promise<T> {
    if (tx) return fn(tx);
    return sequelize.transaction(fn);
  }

  /** Create a decision (managed tx by default) */
  async createForRequest(
    decisionData: CreationAttributes<Decision>,
    opts: WithTx = {}
  ): Promise<Decision> {
    return this.withTx(opts.transaction, async (t) => {
      return Decision.create(decisionData, { transaction: t });
    });
  }

  /** List decisions for a request (optionally within a tx) */
  async listForRequest(
    requestId: number,
    opts: WithTx & { findOptions?: Omit<FindOptions, 'where' | 'include' | 'order'> } = {}
  ): Promise<Decision[]> {
    return Decision.findAll({
      where: { request_id: requestId },
      include: [
        { model: MarketplaceUser, as: 'adjudicator' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
      transaction: opts.transaction,
      ...(opts.findOptions ?? {}),
    });
  }

  /** List decisions for an order (optionally within a tx) */
  async listForOrder(
    orderId: number,
    opts: WithTx & { findOptions?: Omit<FindOptions, 'where' | 'include' | 'order'> } = {}
  ): Promise<Decision[]> {
    return Decision.findAll({
      where: { order_id: orderId },
      include: [
        { model: MarketplaceUser, as: 'adjudicator' },
        { model: Status, as: 'status' },
      ],
      order: [['id', 'DESC']],
      transaction: opts.transaction,
      ...(opts.findOptions ?? {}),
    });
  }

  /** Update status (managed tx by default) */
  async updateStatus(
    decisionId: number,
    statusId: number,
    opts: WithTx = {}
  ): Promise<Decision | null> {
    return this.withTx(opts.transaction, async (t) => {
      const decision = await Decision.findByPk(decisionId, { transaction: t });
      if (!decision) return null;
      await decision.update({ status_id: statusId } as Partial<Decision>, { transaction: t });
      return decision;
    });
  }
}
