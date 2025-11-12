// configureRoutes.ts
import type { Application, Request } from "express";
import express from "express";

import rootRoutes from "../web/routes/rootRoutes";
import userRoutes from "../web/routes/userRoutes";
import requestRoutes from "../web/routes/requestRoutes";
import reportRoutes from "../web/routes/reportRoutes";
import decisionRoutes from "../web/routes/decisionRoutes";
import log from "../service/loggingService";

import { keycloakIntrospectMiddleware } from "./authConfig";
import { requireRoles } from "../utils/authUtils";
import { printRoutes } from "../utils/routeUtils";
import { requestsWhitelistGuard } from "./routesConfig"; // path to the file above

const ADJ_ROLE = (process.env.MARKETPLACE_ADJUDICATOR_ROLE || "").trim();

const configureRoutes = (app: Application) => {
  log.info("Configuring routes...");

  // … existing env logs and base config …

  app.use(express.json());

  // (1) Public routes
  app.use("", rootRoutes);

  // (2) Auth required for all /api
  app.use("/api", keycloakIntrospectMiddleware(true));

  // (3) /api/users → any authenticated user
  app.use("/api/users", userRoutes);

  // (4) /api/requests → guard first, then actual handlers
  app.use("/api/requests", requestsWhitelistGuard(), requestRoutes);

  // (5) /api/decisions → adjudicator only
  app.use("/api/decisions", requireRoles(ADJ_ROLE), decisionRoutes);

  // (6) /api/report → adjudicator only
  app.use("/api/report", requireRoles(ADJ_ROLE), reportRoutes);

  printRoutes(app as any);
};

export default configureRoutes;
