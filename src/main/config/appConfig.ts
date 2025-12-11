import { errorHandler } from "../middleware/errorHandler";
import express from "express";
import cors from "cors";
import path from "path";
import { Application } from "express";
import configureActuator from "./actuatorConfig";
import configureRoutes from "./configureRoutes";
import configureSwagger from "./swaggerConfig";
import configureMorgan from "./morganConfig";
import { metricsMiddleware, register } from "../middleware/metricsMiddleware";
import { initDb } from "../rdbms/entities";
import { appHost, appPort } from "../service/config/middlewareConfigService";

const configureApp = async (app: Application) => {
  const port = Number(process.env.PORT) || 8082;

  // Configure CORS - allow frontend to make requests
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000"];

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "traceparent",
        "tracestate",
      ],
    })
  );

  // Metrics middleware - track all requests
  app.use(metricsMiddleware);

  // Prometheus metrics endpoint
  app.get("/metrics", async (req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res
        .status(500)
        .end(err instanceof Error ? err.message : "Error collecting metrics");
    }
  });

  configureMorgan(app);
  app.use(express.static(path.join(__dirname, "public")));

  // Initialize DB (connect + prepare associations)
  await initDb();
  console.log("Database connection OK");

  configureRoutes(app);
  configureActuator(app);

  configureSwagger(app);

  // Register error handler middleware (should be last)
  app.use(errorHandler);

  app.listen(appPort, appHost, () => {
    console.log(`App listening at http://${appHost}:${appPort}`);
  });

  // graceful shutdown
  const shutdown = async () => {
    const { sequelize } = await import("../rdbms/entities");
    await sequelize.close();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

export default configureApp;
