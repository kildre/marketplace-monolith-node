import express from 'express';
import controller from '../controllers/requestController';

const router = express.Router();

router.post('/viewAll', controller.viewAllRequests);

export default router;
