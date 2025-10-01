import express from 'express';
import 'dotenv/config';
import configureApp from './config/appConfig';
import log from './service/loggingService';
import { assertDatabaseConnectionOk, closeDatabase } from './service/sequelize';
import { sequelize } from './config/sequelizeCLIConfig.cjs';
import { makeMigrator } from './migrate';
require('reflect-metadata');

export default async function run() {
  log.info('Starting Advana Marketplace Monolith ...');

  // Connect to dependencies FIRST
  await assertDatabaseConnectionOk();

  // run migrations (and optionally seeders) at startup
  log.info('Running database migration ...');
  const migrator = makeMigrator(sequelize);

  const pending = await migrator.pending();
  await migrator.up(); // <-- actually run them
  // Build app
  const app = express();
  // If configureApp starts the server inside, await it if it returns a promise
  await Promise.resolve(configureApp(app));

  log.info('Startup complete');
}

// graceful shutdown
async function shutdown(code = 0) {
  try {
    await closeDatabase();
    // If you have a PG pool, close it here: await pool.end();
  } finally {
    process.exit(code);
  }
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

process.on('uncaughtException', (err: unknown) => {
  const msg = err instanceof Error ? err.stack ?? err.message : String(err);
  log.error(`Uncaught Exception: ${msg}`);
  shutdown(1);
});