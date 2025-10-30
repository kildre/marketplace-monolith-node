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

// Single source of truth for adjudicator role (from env)
const ADJ_ROLE = (process.env.MARKETPLACE_ADJUDICATOR_ROLE || "").trim();
// Convenience gate; if env not set, no role restriction is applied
const requireAdjudicator = requireRoles(ADJ_ROLE);

const configureRoutes = (app: Application) => {
  log.info("Configuring routes...");
  if (!ADJ_ROLE) {
    log.warn(
      "[CONFIG] MARKETPLACE_ADJUDICATOR_ROLE is not set. Approver-only endpoints will NOT be role-gated (token still required)."
    );
  } else {
    log.info(`[CONFIG] MARKETPLACE_ADJUDICATOR_ROLE = ${ADJ_ROLE}`);
  }

  app.use(express.json());

  // (1) Public routes FIRST (no auth)
  app.use("", rootRoutes); // e.g., /health, landing page, etc.

  // (2) Protect the entire /api tree via introspection (valid token required)
  app.use("/api", keycloakIntrospectMiddleware(true));

  // (3) Mount protected route groups
  app.use(
    "/api/users",
    (req, _res, next) => {
      log.debug(`[ROUTES] /api/users as ${(req as any).auth?.username}`);
      next();
    },
    // No role checks: allowed for all authenticated users
    userRoutes
  );

  // Requests: POST /viewAll and /viewPending require adjudicator; others allowed for any authenticated user
  app.use(
    "/api/requests",
    (req, res, next) => {
      log.debug(`[ROUTES] /api/requests as ${(req as any).auth?.username}`);
      log.debug(`[ROUTES] /api/requests method: ${req.method} path: ${req.path}`);

      if (
        req.method === "POST" &&
        (req.path === "/viewAll" || req.path === "/viewPending")
      ) {
        return requireAdjudicator(req, res, next);
      }
      return next();
    },
    requestRoutes
  );

  // Decisions: require any approver-capable role
  app.use(
    "/api/decisions",
    (req, _res, next) => {
      log.debug(`[ROUTES] /api/decisions as ${(req as any).auth?.username}`);
      next();
    },
    requireAdjudicator,
    decisionRoutes
  );

  // Reports: allow read or write marketplace roles
  app.use(
    "/api/report",
    (req, _res, next) => {
      log.debug(`[ROUTES] /api/report as ${(req as any).auth?.username}`);
      next();
    },
    reportRoutes
  );

  // Route inventory (for debugging)
  printRoutes(app as any);
};

export default configureRoutes;