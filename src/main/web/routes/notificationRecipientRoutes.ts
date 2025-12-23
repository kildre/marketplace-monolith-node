import express from "express";
import controller from "../controllers/notificationRecipientController";

const notificationRecipientRoutes = express.Router();

/**
 * @swagger
 * /api/notificationRecipients/visible:
 *   get:
 *     tags:
 *       - NotificationRecipients
 *     summary: Get visible notification recipients for the authenticated user
 *     description: |
 *       Retrieves all notification recipients that are visible to the currently authenticated user.
 *       The user must be authenticated via middleware that sets req.currentUser.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Successfully retrieved visible notification recipients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NotificationRecipientDto'
 *             example:
 *               - notification:
 *                   id: 1
 *                   title: "System Maintenance Notice"
 *                   message: "The system will be down for maintenance tonight"
 *                   priorityLevel: 2
 *                   createdAt: "2025-12-18T10:00:00.000Z"
 *                   updatedAt: "2025-12-18T10:00:00.000Z"
 *                 read: false
 *                 createdAt: "2025-12-18T10:00:00.000Z"
 *                 updatedAt: "2025-12-18T10:00:00.000Z"
 *       '401':
 *         description: User not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 *             example:
 *               errMsg: "Current user not found"
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 */
notificationRecipientRoutes.get("/visible", controller.getVisible);

export default notificationRecipientRoutes;

