import express from "express";
import { renderIndex } from "../controllers/rootController";
import {
  throwTestError,
  throwConstraintError,
} from "../controllers/errorTestController";

const rootRouter = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Render the index page
 *     responses:
 *       200:
 *         description: Returns the index.html file
 */

rootRouter.get("/", renderIndex);

// Test error routes
rootRouter.get("/test-error", throwTestError);
rootRouter.get("/test-constraint-error", throwConstraintError);

export default rootRouter;
