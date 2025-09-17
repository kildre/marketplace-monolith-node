// src/dao/MarketplaceSummaryReportDAO.ts
import { Transaction, QueryTypes } from 'sequelize';
import { sequelize } from '../db'; // wherever you export your Sequelize instance
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { UseCaseRequest } from '../entities/UseCaseRequest';
import { MarketplaceOrder } from '../entities/MarketplaceOrder';

type WithTx = { transaction?: Transaction };

export interface MarketplaceSummary {
  totalUsers: number;
  totalUseCases: number;
  totalOrders: number;
}

export class MarketplaceSummaryReportDAO {
  static async countTotalUsers(opts: WithTx = {}): Promise<number> {
    return MarketplaceUser.count({ transaction: opts.transaction });
  }

  static async countTotalUseCases(opts: WithTx = {}): Promise<number> {
    return UseCaseRequest.count({ transaction: opts.transaction });
  }

  static async countTotalOrders(opts: WithTx = {}): Promise<number> {
    return MarketplaceOrder.count({ transaction: opts.transaction });
  }

  /**
   * Optional: do it in ONE SQL roundtrip (Postgres shown).
   * Falls back to your actual table names.
   */
  static async getSummary(opts: WithTx = {}): Promise<MarketplaceSummary> {
    const userTable = MarketplaceUser.getTableName() as string;
    const reqTable  = UseCaseRequest.getTableName() as string;
    const ordTable  = MarketplaceOrder.getTableName() as string;

    const [row] = await sequelize.query<{
      totalusers: number; totalusecases: number; totalorders: number;
    }>(
      `
      SELECT
        (SELECT COUNT(*) FROM ${userTable})  AS totalUsers,
        (SELECT COUNT(*) FROM ${reqTable})   AS totalUseCases,
        (SELECT COUNT(*) FROM ${ordTable})   AS totalOrders
      `,
      { type: QueryTypes.SELECT, transaction: opts.transaction }
    );

    // keys are already aliased as camelCase above; cast defensively
    return {
      totalUsers: Number((row as any).totalUsers),
      totalUseCases: Number((row as any).totalUseCases),
      totalOrders: Number((row as any).totalOrders),
    };
  }
}
