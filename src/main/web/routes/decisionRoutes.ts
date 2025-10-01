import express from 'express';
import controller from '../controllers/decisionController';

const router = express.Router();

router.post('/', controller.submit);

export default router;
