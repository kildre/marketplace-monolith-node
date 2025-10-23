// src/services/MarketplaceSummaryReportService.ts
import { Transaction } from 'sequelize';
import { sequelize } from '../config/sequelizeCLIConfig.cjs';
import {
  MarketplaceSummaryReportDAO,
  MarketplaceSummary,
} from '../rdbms/dao/MarketplaceSummaryReportDAO';

type WithTx = { transaction?: Transaction };

export class MarketplaceReportService {
  /**
   * Returns marketplace summary in a single SQL roundtrip (preferred).
   * Falls back to the 3-count strategy if `singleQuery=false`.
   */
  async getSummary(opts: WithTx & { singleQuery?: boolean } = {}): Promise<MarketplaceSummary> {
    const { transaction, singleQuery = true } = opts;

    // If a tx is provided, use it. Otherwise, run a managed read-only tx.
    const run = async (t: Transaction) => {
      if (singleQuery) {
        return MarketplaceSummaryReportDAO.getSummary({ transaction: t });
      }

      // Fallback: do three counts (still inside one transaction)
      const [totalUsers, totalUseCases, totalOrders] = await Promise.all([
        (await MarketplaceSummaryReportDAO.getSummary({ transaction: t })).totalUsers,
        (await MarketplaceSummaryReportDAO.getSummary({ transaction: t })).totalUseCases,
        (await MarketplaceSummaryReportDAO.getSummary({ transaction: t })).totalOrders,
      ]);

      return { totalUsers, totalUseCases, totalOrders };
    };

    return transaction
      ? run(transaction)
      : sequelize.transaction({ readOnly: true }, run);
  }
}

export const marketplaceReportService = new MarketplaceReportService();
