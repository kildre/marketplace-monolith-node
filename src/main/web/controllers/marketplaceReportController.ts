// src/controllers/MarketplaceSummaryReportController.ts
import { Request, Response, NextFunction } from 'express';
import { MarketplaceReportService } from '../../service/marketplaceReportService';

const service = new MarketplaceReportService();

/**
 * GET /api/report
 */
async function report(_req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await service.getSummary(); // no options, no params
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

export default { report };
