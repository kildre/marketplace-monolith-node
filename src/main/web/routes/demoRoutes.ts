import express from 'express';
import controller from '../controllers/demoController';

const demoRouter = express.Router();

/**
 * @swagger
 * /api/demo/reset:
 *   post:
 *     summary: Reset demo data (DEV ONLY)
 *     description: Clears all requests, orders, cart items, and decisions for demo purposes. Only works in development mode.
 *     tags: [Demo]
 *     operationId: resetDemoData
 *     responses:
 *       200:
 *         description: Demo data reset successfully
 *       403:
 *         description: Not allowed in production
 *       500:
 *         description: Internal server error
 */
demoRouter.post('/reset', controller.resetDemoData);

export default demoRouter;
