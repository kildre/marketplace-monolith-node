import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/sequelizeCLIConfig.cjs';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { UseCaseRequest } from '../entities/UseCaseRequest';
import { MarketplaceOrder } from '../entities/MarketplaceOrder';

type WithTx = { transaction?: import('sequelize').Transaction };

export interface MarketplaceSummary {
  totalUsers: number;
  totalUseCases: number;
  totalOrders: number;
}

export class MarketplaceSummaryReportDAO {
  static async getSummary(opts: WithTx = {}): Promise<MarketplaceSummary> {
    // Quote table names safely (handles schema/table objects)
    const qg = sequelize.getQueryInterface().queryGenerator;
    const userTable = qg.quoteTable(MarketplaceUser.getTableName() as any);
    const reqTable  = qg.quoteTable(UseCaseRequest.getTableName() as any);
    const ordTable  = qg.quoteTable(MarketplaceOrder.getTableName() as any);

    const [row] = await sequelize.query<{
      totalUsers: number; totalUseCases: number; totalOrders: number;
    }>(
      `
      SELECT
        COALESCE((SELECT COUNT(*)::int FROM ${userTable}), 0)  AS "totalUsers",
        COALESCE((SELECT COUNT(*)::int FROM ${reqTable}), 0)   AS "totalUseCases",
        COALESCE((SELECT COUNT(*)::int FROM ${ordTable}), 0)   AS "totalOrders"
      `,
      { type: QueryTypes.SELECT, transaction: opts.transaction }
    );

    // Now the keys are exactly camelCase because they were quoted.
    return {
      totalUsers: Number((row as any).totalUsers),
      totalUseCases: Number((row as any).totalUseCases),
      totalOrders: Number((row as any).totalOrders),
    };
  }
}
