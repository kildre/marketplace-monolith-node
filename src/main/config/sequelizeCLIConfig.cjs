// src/main/config/sequelizeCLIConfig.cjs
require('dotenv/config');
const { Sequelize } = require('sequelize');

/* ---------- helpers ---------- */
const isTrue = (v, d = false) => (v ? /^(1|true|yes|on)$/i.test(String(v)) : d);

/* ---------- env -> connection ---------- */
const RAW_DIALECT = (process.env.DB_DIALECT || process.env.DIALECT || 'postgres').toLowerCase();
const DIALECT = RAW_DIALECT === 'sqlite3' ? 'sqlite' : RAW_DIALECT;
if (RAW_DIALECT === 'sqlite3') console.warn('[sequelize] Normalized dialect "sqlite3" -> "sqlite"');

// Prefer your secret; fallback to DATABASE_URL
const URL = process.env['secret-env-postgresql'] || process.env['SECRET_ENV_POSTGRESQL'] || null;
console.log('[sequelize] Checking URL:', URL ? 'FOUND' : 'NOT FOUND');
console.log('[sequelize] secret-env-postgresql:', process.env['secret-env-postgresql'] ? 'EXISTS' : 'MISSING');
console.log('[sequelize] SECRET_ENV_POSTGRESQL:', process.env['SECRET_ENV_POSTGRESQL'] ? 'EXISTS' : 'MISSING');
if (URL) process.env.SEQUELIZE_URL = URL; // single source for CLI

/* ---------- shared options ---------- */
const BASE = {
  dialect: DIALECT,
  logging: isTrue(process.env.SEQUELIZE_LOG_SQL) ? console.log : false,
  define: {
    underscored: true,
    freezeTableName: false,
  },
  // Optional SSL (Postgres): enable if DB_SSL=true
  ...(DIALECT === 'postgres' && isTrue(process.env.DB_SSL)
    ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
    : {}),
};

const STORAGE = {
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'SequelizeMeta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
};

/* ---------- connection fields ---------- */
const connectionFields = () =>
  process.env.SEQUELIZE_URL ? { use_env_variable: 'SEQUELIZE_URL' } : {};

/* ---------- environments for sequelize-cli ---------- */
const development = { ...connectionFields(), ...BASE, ...STORAGE };
const test        = { ...connectionFields(), ...BASE, logging: false, ...STORAGE };
const production  = { ...connectionFields(), ...BASE, ...STORAGE };

/* ---------- optional: runtime factory for app code ---------- */
function createSequelize(envName) {
  const env = envName || process.env.NODE_ENV || 'development';
  const cfgMap = { development, test, production };
  const cfg = cfgMap[env] || development;

  const {
    use_env_variable,
    migrationStorage,
    migrationStorageTableName,
    seederStorage,
    seederStorageTableName,
    ...sequelizeOpts
  } = cfg;
  
  // Check for the URL at runtime
  const url = process.env.SEQUELIZE_URL || process.env['secret-env-postgresql'] || process.env['SECRET_ENV_POSTGRESQL'];
  
  if (url) {
    return new Sequelize(url, sequelizeOpts);
  }
  
  console.log(`[sequelize] No connection URL for env "${env}"`);
  throw new Error(`Database or username missing for non-URL config`);
}

const sequelize = createSequelize();

/* ---------- exports ---------- */
module.exports = {
  development,
  test,
  production,
  createSequelize, // optional for app
  sequelize,       // optional for app
};
