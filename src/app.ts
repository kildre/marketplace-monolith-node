import express from 'express';
import 'dotenv/config';
import configureApp from './config/appConfig';
import { runPgQuery, runPgQueryWithVars } from './service/pgService';
import log from './service/loggingService';
import redisClient from '@advana/redis-client';
import { assertDatabaseConnectionOk, closeDatabase } from './service/sequelize';

let redis: Awaited<ReturnType<typeof redisClient>> | null = null;

async function connectRedis() {
  const client = await redisClient();
  await client.set('key', 'Hello world from Redis!');
  const v = await client.get('key');
  log.info({ redisEcho: v });
  return client;
}

export default async function run() {
  log.info('Starting Advana Marketplace Monolith ...');

  // Connect to dependencies FIRST
  await assertDatabaseConnectionOk();
  redis = await connectRedis();

  // Build app
  const app = express();
  // If configureApp starts the server inside, await it if it returns a promise
  await Promise.resolve(configureApp(app));

  log.info('Startup complete');
}

// graceful shutdown
async function shutdown(code = 0) {
  try {
    if (redis) {
      try { await redis.quit(); } catch { await redis.disconnect(); }
      redis = null;
    }
    await closeDatabase();
    // If you have a PG pool, close it here: await pool.end();
  } finally {
    process.exit(code);
  }
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

process.on('uncaughtException', (err) => {
  log.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  shutdown(1);
});