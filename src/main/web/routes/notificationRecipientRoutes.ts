import express from "express";
import controller from "../controllers/notificationRecipientController";

const notificationRecipientRoutes = express.Router();

/**
 * @swagger
 * /api/notificationRecipients/visible:
 *   post:
 *     tags:
 *       - NotificationRecipients
 *     summary: Retrieve visible notification recipients for the current user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GetVisibleNotificationRecipientsRequestDto'
 *     responses:
 *       '200':
 *         description: Array of visible notification recipients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NotificationRecipientDto'
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 */
notificationRecipientRoutes.post("/visible", controller.getVisible);

export default notificationRecipientRoutes;

