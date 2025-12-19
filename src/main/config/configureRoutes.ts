// configureRoutes.ts
import type { Application } from "express";
import express from "express";

import rootRoutes from "../web/routes/rootRoutes";
import requestRoutes from "../web/routes/requestRoutes";
// sessionRouter contains register / status / expire; we now split handling so only register stays protected.
import reportRoutes from "../web/routes/reportRoutes";
import decisionRoutes from "../web/routes/decisionRoutes";
// Session controllers (public + protected)
import {
  getSessionStatusController,
  expireSessionController,
  registerSessionController,
} from "../web/controllers/sessionController";
import log from "../service/loggingService";

import { keycloakIntrospectMiddleware } from "./authConfig";
import { requireRoles } from "../utils/authUtils";
import { printRoutes } from "../utils/routeUtils";
import { requestsWhitelistGuard } from "./routesConfig"; // path to the file above
import notificationRecipientRoutes from "../web/routes/notificationRecipientRoutes";

const ADJ_ROLE = (process.env.MARKETPLACE_ADJUDICATOR_ROLE || "").trim();

const configureRoutes = (app: Application) => {
  log.info("Configuring routes...");

  // … existing env logs and base config …

  // Configure request body parsing with size limits to prevent overflow attacks
  app.use(
    express.json({
      limit: "10mb", // Prevent large JSON payloads
      strict: true,
    })
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: "10mb",
    })
  );

  // (1) Public root-level routes
  app.use("", rootRoutes);

  // (2) Public session endpoints (NO auth) → GET /api/session/:sessionId, POST /api/session/expire
  // Placed BEFORE the /api auth middleware so they bypass Keycloak introspection.
  const publicSessionRouter = express.Router();
  publicSessionRouter.get("/:sessionId", getSessionStatusController);
  publicSessionRouter.post("/expire", expireSessionController);
  app.use("/api/session", publicSessionRouter);

  // (3) Auth required for remaining /api endpoints
  app.use("/api", keycloakIntrospectMiddleware(true));

  // (5) /api/requests → guard first, then actual handlers
  app.use("/api/requests", requestsWhitelistGuard(), requestRoutes);

  // (6) /api/decisions → adjudicator only
  app.use("/api/decisions", requireRoles(ADJ_ROLE), decisionRoutes);

  // (7) /api/report → adjudicator only
  app.use("/api/report", requireRoles(ADJ_ROLE), reportRoutes);

  // (8) /api/notificationRecipients → any authenticated user
  app.use("/api/notificationRecipients", notificationRecipientRoutes);

  // (9) POST /api/session/register → protected (requires auth) for creating session tokens
  // Previously mis-mounted with app.use('/api/session/register', router) causing /register/register path.
  app.post("/api/session/register", registerSessionController);

  printRoutes(app as any);
};

export default configureRoutes;
