import express from 'express';
import controller from '../controllers/userController';

const router = express.Router();

/**
 * @swagger
 * /api/users/isAuthorizedAdjudicator:
 *   post:
 *     summary: Checks if the user is an authorized adjudicator
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userEmail:
 *                 type: string
 *                 example: user@example.com
 *             required:
 *               - userEmail
 *     responses:
 *       200:
 *         description: Role check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasRole:
 *                   type: boolean
 *                   nullable: false
 *                   example: true
 */
router.post("/isAuthorizedAdjudicator", controller.isAuthorizedAdjudicator);



export default router;
