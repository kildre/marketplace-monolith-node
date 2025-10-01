import express from 'express';
import controller from '../controllers/requestController';

const router = express.Router();

/**
 * @swagger
 * /api/requests/viewAll:
 *   post:
 *     summary: View all use case requests (adjudicator only)
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
 *         description: List of all requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UseCaseRequestDto'
 */
router.post('/viewAll', controller.viewAllRequests);

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Submit a new use case request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitRequestRequestDto'
 *     responses:
 *       200:
 *         description: Submission result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmitRequestResponseDto'
 */
router.post('/', controller.submit);

/**
 * @swagger
 * /api/requests/viewPending:
 *   post:
 *     summary: View all pending use case requests (adjudicator only)
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
 *         description: List of pending requests
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UseCaseRequestDto'
 */
router.post('/viewPending', controller.viewPendingRequests);

/**
 * @swagger
 * /api/requests/viewForRequestor:
 *   post:
 *     summary: View all requests submitted by the requestor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userEmail:
 *                 type: string
 *                 example: requestor@example.com
 *             required:
 *               - userEmail
 *     responses:
 *       200:
 *         description: List of requests for the requestor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UseCaseRequestDto'
 */
router.post('/viewForRequestor', controller.viewRequestsForRequestor);

/**
 * @swagger
 * /api/requests/viewForRequestNumber:
 *   post:
 *     summary: View a request by its request number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               requestNumber:
 *                 type: string
 *                 example: "REQ-12345"
 *               userEmail:
 *                 type: string
 *                 example: "user@example.com"
 *             required:
 *               - requestNumber
 *               - userEmail
 *     responses:
 *       200:
 *         description: Request details for the given request number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UseCaseRequestDto'
 */
router.post('/viewForRequestNumber', controller.viewRequestByRequestNumber);

export default router;
