import express from 'express';
import controller from '../controllers/userController';

const userRouter = express.Router();

/**
 * @swagger
 * /api/users/isAuthorizedAdjudicator:
 *   post:
 *     summary: Check if the user is an authorized adjudicator
 *     description: Returns whether the supplied email has the adjudicator role.
 *     tags: [Users]
 *     operationId: isAuthorizedAdjudicator
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoleCheckRequestDto'
 *     responses:
 *       200:
 *         description: Authorization result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RoleCheckResponseDto'
 *       400:
 *         description: Invalid request
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
userRouter.post("/isAuthorizedAdjudicator", controller.isAuthorizedAdjudicator);

export default userRouter;
