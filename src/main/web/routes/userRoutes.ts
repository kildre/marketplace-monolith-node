import express from 'express';
import controller from '../controllers/userController';

const router = express.Router();

/**
 * @swagger
 * /api/users/isAuthorizedAdjudicator:
 *   post:
 *     summary: Check if the user is an authorized adjudicator
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
 */
router.post("/isAuthorizedAdjudicator", controller.isAuthorizedAdjudicator);

export default router;
