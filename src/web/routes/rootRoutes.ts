import express from "express";
import { renderIndex } from "../controllers/rootController";
import {
  throwTestError,
  throwConstraintError,
} from "../controllers/errorTestController";

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

router.get("/", renderIndex);
// Test error routes
router.get("/test-error", throwTestError);
router.get("/test-constraint-error", throwConstraintError);

export default router;
