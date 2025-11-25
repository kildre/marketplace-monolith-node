import express from "express";
import {
  registerSessionController,
  getSessionStatusController,
  expireSessionController,
} from "../controllers/sessionController";

const sessionRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Session
 *   description: Manage frontend session IDs mapped to Keycloak tokens
 */

/**
 * @swagger
 * /api/session/register:
 *   post:
 *     summary: Register a new session and store Keycloak token
 *     description: Validates the Keycloak token, extracts roles, and stores it using the session ID.
 *     tags: [Session]
 *     operationId: registerSession
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterSessionRequestDto'
 *     responses:
 *       201:
 *         description: Session registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterSessionResponseDto'
 *       400:
 *         description: Invalid request payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 *       401:
 *         description: Invalid Keycloak token
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
sessionRouter.post("/register", registerSessionController);


/**
 * @swagger
 * /api/session/{sessionId}:
 *   get:
 *     summary: Get session status by session ID
 *     description: Returns active/expired/revoked status and Keycloak user info.
 *     tags: [Session]
 *     operationId: getSessionStatus
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID assigned by the frontend UI
 *     responses:
 *       200:
 *         description: Session status returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetSessionResponseDto'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetSessionResponseDto'
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
sessionRouter.get("/:sessionId", getSessionStatusController);


/**
 * @swagger
 * /api/session/expire:
 *   post:
 *     summary: Expire or revoke a frontend session
 *     description: Marks the stored session token as revoked and invalid for further backend calls.
 *     tags: [Session]
 *     operationId: expireSession
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExpireSessionRequestDto'
 *     responses:
 *       200:
 *         description: Session expired successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExpireSessionResponseDto'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExpireSessionResponseDto'
 *       400:
 *         description: Invalid request body
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
sessionRouter.post("/expire", expireSessionController);


export default sessionRouter;
