import express from 'express';
import controller from '../controllers/decisionController';

const decsionRouter = express.Router();

/**
 * @swagger
 * /api/decisions:
 *   post:
 *     summary: Submit a decision for a use case request
 *     description: Creates a decision entry for a previously submitted request.
 *     tags: [Decisions]
 *     operationId: submitDecision
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
 *       403:
 *         description: User is not authorized as adjudicator
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 *       404:
 *         description: Related request not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 *       409:
 *         description: Duplicate or conflicting value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 */
decsionRouter.post('/', controller.submit);

export default decsionRouter;
