// src/web/routes/requestRoutes.ts
import express from 'express';
import controller from '../controllers/requestController';

const router = express.Router();

router.post('/viewAll', controller.viewAllRequests);
router.post('/', controller.submit);
router.post('/viewPending', controller.viewPendingRequests);
router.post('/viewForRequestor', controller.viewRequestsForRequestor);

export default router;
