import express from 'express';
import controller from '../controllers/decisionController';

const router = express.Router();

/**
 * @swagger
 * /api/decisions:
 *   post:
 *     summary: Submit a decision for a use case request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitDecisionRequestDto'
 *     responses:
 *       200:
 *         description: Decision submission result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitDecisionResponseDto'
 */
router.post('/', controller.submit);

export default router;
