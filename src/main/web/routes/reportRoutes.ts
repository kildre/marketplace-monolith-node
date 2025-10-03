import express from 'express';
import controller from '../controllers/marketplaceReportController';

const router = express.Router();

/**
 * @swagger
 * /summary:
 *   get:
 *     summary: Retrieve the marketplace summary.
 *     description: Returns key marketplace totals. No parameters are required.
 *     tags:
 *       - Reports
 *     operationId: getMarketplaceSummary
 *     responses:
 *       200:
 *         description: Successfully retrieved the summary.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: integer
 *                   example: 5
 *                 totalUseCases:
 *                   type: integer
 *                   example: 12
 *                 totalOrders:
 *                   type: integer
 *                   example: 7
 *       500:
 *         description: Internal server error.
 */
router.get('/summary', controller.report);

export default router;
