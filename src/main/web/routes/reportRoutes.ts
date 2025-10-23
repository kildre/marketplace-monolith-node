import express from 'express';
import controller from '../controllers/marketplaceReportController';

const reportRouter = express.Router();

/**
 * @swagger
 * /api/report/summary:
 *   get:
 *     summary: Retrieve the marketplace summary
 *     description: Returns key marketplace totals. No parameters are required.
 *     tags: [Reports]
 *     operationId: getMarketplaceSummary
 *     responses:
 *       200:
 *         description: Successfully retrieved the summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarketplaceSummaryReport'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 */
reportRouter.get('/summary', controller.report);

export default reportRouter;
