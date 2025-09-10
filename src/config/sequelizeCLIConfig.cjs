// src/db/config/config.cjs
require('dotenv/config');

const bool = (v, d = false) => (v ? /^(1|true|yes|on)$/i.test(v) : d);
const num  = (v, d) => (v !== undefined && v !== '' ? Number(v) : d);
const nonEmpty = (v) => (v && v.trim().length ? v.trim() : undefined);

const DIALECT = process.env.DB_DIALECT || 'postgres';
const schema = nonEmpty(process.env.DB_SCHEMA);

const BASE = {
  dialect: DIALECT,
  host: process.env.PG_HOST || process.env.DB_HOST || 'localhost',
  port: num(process.env.PG_PORT || process.env.DB_PORT, 5432),
  database: process.env.PG_DATABASE || process.env.DB_NAME || process.env.DB_DATABASE || 'marketplace_db',
  username: process.env.PG_USER || process.env.DB_USER || 'postgres',
  password: process.env.PG_PASSWORD || process.env.DB_PASSWORD || 'postgres',
  logging: bool(process.env.SEQUELIZE_LOG_SQL, false) ? console.log : false,
  timezone: process.env.DB_TZ || '+00:00',
  pool: {
    max: num(process.env.DB_POOL_MAX, 10),
    min: num(process.env.DB_POOL_MIN, 0),
    acquire: num(process.env.DB_POOL_ACQUIRE_MS, 30000),
    idle: num(process.env.DB_POOL_IDLE_MS, 10000),
  },
  define: {
    underscored: true,
    ...(schema ? { schema } : {}),
  },
  dialectOptions: {
    ...(bool(process.env.DB_SSL) || bool(process.env.PG_SSL)
      ? { ssl: { require: true, rejectUnauthorized: bool(process.env.DB_SSL_REJECT_UNAUTHORIZED, true) } }
      : {}),
    ...(schema ? { searchPath: schema } : {}),
  },
};

const url = nonEmpty(process.env.DATABASE_URL);

const development = {
  ...(url ? { url } : BASE),
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'SequelizeMeta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
};

const test = {
  ...(url ? { url } : { ...BASE, database: process.env.PG_DATABASE_TEST || 'marketplace_db_test' }),
  logging: false,
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'SequelizeMeta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
};

const production = {
  ...(url ? { url } : BASE),
  logging: bool(process.env.SEQUELIZE_LOG_SQL, false) ? console.log : false,
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'SequelizeMeta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
};

module.exports = { development, test, production };
