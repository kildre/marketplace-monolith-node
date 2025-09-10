import express from 'express';
import controller from '../controllers/userController';

const router = express.Router();

router.post("/isAuthorizedAdjudicator", controller.isAuthorizedAdjudicator);



export default router;