import express from 'express';
import { renderIndex } from '../controllers/rootController';

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Render the index page
 *     responses:
 *       200:
 *         description: Returns the index.html file
 */
router.get('/', renderIndex);

export default router;
