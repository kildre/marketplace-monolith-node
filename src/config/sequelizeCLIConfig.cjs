// src/config/sequelizeCLIConfig.cjs
require('dotenv/config');
const { Sequelize } = require('sequelize');

// ---------- helpers ----------
const bool = (v, d = false) => (v ? /^(1|true|yes|on)$/i.test(v) : d);
const num = (v, d) => (v !== undefined && v !== '' ? Number(v) : d);
const nonEmpty = (v) => (v && String(v).trim().length ? String(v).trim() : undefined);

// ---------- env → connection ----------
const DIALECT =
  process.env.DB_DIALECT ||
  process.env.DIALECT ||
  'postgres';

// Prefer URL if available (supports your secret key with hyphens)
const URL =
  process.env.DATABASE_URL ||
  process.env.DB_URL ||
  process.env.PG_URL ||
  process.env['secret-env-postgresql'] ||
  process.env.SECRET_ENV_POSTGRESQL ||
  null;

// If we have a URL, expose it to the CLI via a stable env var
if (URL) process.env.SEQUELIZE_URL = URL;

const HOST = process.env.PG_HOST || process.env.DB_HOST || 'localhost';
const PORT = num(process.env.PG_PORT || process.env.DB_PORT, 5432);
const DATABASE = process.env.PG_DATABASE || process.env.DB_NAME || process.env.DB_DATABASE || 'postgres';
const USERNAME = process.env.PG_USER || process.env.DB_USER || 'postgres';
const PASSWORD = process.env.PG_PASSWORD || process.env.DB_PASSWORD || '';
const SCHEMA = nonEmpty(process.env.DB_SCHEMA);

// ---------- shared options ----------
const BASE_OPTS = {
  dialect: DIALECT,
  logging: bool(process.env.SEQUELIZE_LOG_SQL, false) ? console.log : false,
  ...(SCHEMA ? { schema: SCHEMA } : {}),
  define: {
    underscored: true,
    freezeTableName: false,
    ...(SCHEMA ? { schema: SCHEMA } : {}),
  },
};

const sharedStorage = {
  migrationStorage: 'sequelize',
  migrationStorageTableName: 'SequelizeMeta',
  seederStorage: 'sequelize',
  seederStorageTableName: 'SequelizeData',
};

// Build the connection shape the CLI expects.
// If a URL is present, use a "use_env_variable" indirection.
// Otherwise, pass discrete fields.
function connectionFields() {
  if (process.env.SEQUELIZE_URL) {
    return { use_env_variable: 'SEQUELIZE_URL' };
  }
  return {
    username: USERNAME,
    password: PASSWORD,
    database: DATABASE,
    host: HOST,
    port: PORT,
  };
}

// ---------- CLI environments ----------
const development = {
  ...connectionFields(),
  ...BASE_OPTS,
  ...sharedStorage,
};

const test = {
  ...connectionFields(),
  ...BASE_OPTS,
  logging: false,
  ...sharedStorage,
};

const production = {
  ...connectionFields(),
  ...BASE_OPTS,
  ...sharedStorage,
};

// ---------- Runtime factory (optional, for app code) ----------
function createSequelize(envName) {
  const env = envName || process.env.NODE_ENV || 'development';
  const cfgMap = { development, test, production };
  const cfg = cfgMap[env] || development;

  const {
    use_env_variable,
    username,
    password,
    database,
    // strip CLI-only fields:
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

  return new Sequelize(database, username, password, sequelizeOpts);
}

const sequelize = createSequelize();

// Expose both CLI config & runtime helpers
module.exports = {
  development,
  test,
  production,
  createSequelize,
  sequelize,
};
