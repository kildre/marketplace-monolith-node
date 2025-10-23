import express from 'express';
import controller from '../controllers/requestController';

const requestRouter = express.Router();

/**
 * @swagger
 * /api/requests/viewAll:
 *   post:
 *     summary: View all use case requests (adjudicator only)
 *     description: Returns all requests when the supplied email has adjudicator role.
 *     tags: [Requests]
 *     operationId: viewAllRequests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ViewRequestsRequestDto'
 *     responses:
 *       200:
 *         description: List of all requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ViewRequestsResponseDto'
 *       403:
 *         description: Not authorized
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
requestRouter.post('/viewAll', controller.viewAllRequests);

/**
 * @swagger
 * /api/requests:
 *   post:
 *     summary: Submit a new use case request
 *     description: Creates a new use case request.
 *     tags: [Requests]
 *     operationId: submitRequest
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
requestRouter.post('/', controller.submit);

/**
 * @swagger
 * /api/requests/viewPending:
 *   post:
 *     summary: View all pending use case requests (adjudicator only)
 *     description: Returns all pending requests when the supplied email has adjudicator role.
 *     tags: [Requests]
 *     operationId: viewPendingRequests
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ViewRequestsRequestDto'
 *     responses:
 *       200:
 *         description: List of pending requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ViewRequestsResponseDto'
 *       403:
 *         description: Not authorized
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
requestRouter.post('/viewPending', controller.viewPendingRequests);

/**
 * @swagger
 * /api/requests/viewForRequestor:
 *   post:
 *     summary: View all requests submitted by the requestor
 *     description: Returns all requests made by the provided requestor email.
 *     tags: [Requests]
 *     operationId: viewRequestsForRequestor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ViewRequestsRequestDto'
 *     responses:
 *       200:
 *         description: List of requests for the requestor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ViewRequestsResponseDto'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorDto'
 */
requestRouter.post('/viewForRequestor', controller.viewRequestsForRequestor);

/**
 * @swagger
 * /api/requests/viewForRequestNumber:
 *   post:
 *     summary: View a request by its request number
 *     description: Returns one request matching the request number.
 *     tags: [Requests]
 *     operationId: viewRequestByRequestNumber
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ViewRequestByRequestNumDto'
 *     responses:
 *       200:
 *         description: Request details for the given request number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UseCaseRequestDto'
 *       404:
 *         description: Request not found
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
requestRouter.post('/viewForRequestNumber', controller.viewRequestByRequestNumber);

export default requestRouter;
