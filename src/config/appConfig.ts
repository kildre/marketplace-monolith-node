// configureApp.ts
import express from 'express';
import path from 'path';
import { Application } from 'express';
import configureActuator from './actuatorConfig';
import configureRoutes from './routesConfig';
import configureSwagger from './swaggerConfig';
import configureMorgan from './morganConfig';

import { initDb } from '../models'; // ⬅️ add
import { appHost, appPort } from 'src/config/services/middlewareConfigService';

const configureApp = async (app: Application) => {
  configureMorgan(app);
  app.use(express.static(path.join(__dirname, 'public')));

  // Initialize DB (connect + prepare associations)
  await initDb();
  console.log('Database connection OK');

  configureRoutes(app);
  configureActuator(app);
  configureSwagger(app);

  app.listen(appPort, appHost, () => {
    console.log(`App listening at http://${appHost}:${appPort}`);
  });

  // graceful shutdown
  const shutdown = async () => {
    const { sequelize } = await import('./sequelizeConfig');
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

export default configureApp;
