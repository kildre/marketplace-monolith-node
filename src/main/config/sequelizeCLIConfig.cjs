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
const URL = process.env['secret-env-postgresql'] || process.env.DATABASE_URL || null;
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

  if (use_env_variable) {
    const url = process.env[use_env_variable];
    if (!url) throw new Error(`Env var ${use_env_variable} not set`);
    return new Sequelize(url, sequelizeOpts);
  }

  // Only used if you decide to pass discrete creds instead of URL.
  const { database, username, password } = process.env;
  if (!database || !username) throw new Error('Database or username missing for non-URL config');
  return new Sequelize(database, username, password, sequelizeOpts);
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
