import { Sequelize } from 'sequelize';

// Use require because config/config.js is CommonJS
// eslint-disable-next-line @typescript-eslint/no-var-requires
const allConfigs = require('../config/appConfig.js');

const env = process.env.EXPRESS_PROFILE || 'development';
const cfg = allConfigs[env];

export const sequelize = new Sequelize(
  process.env.PG_DATABASE || 'marketplace_db',
  process.env.PG_USER || 'postgres',
  process.env.PG_PASSWORD || 'postgres',
  {
    host: process.env.PG_HOST || 'localhost',
    port: Number(process.env.PG_PORT) || 5432,
    dialect: (process.env.DB_DIALECT as any) || 'postgres',
    logging: false,
  }
);

function sanitize(o: any) {
  if (!o) return o;
  const { password, ssl, dialectOptions, ...rest } = o;
  return {
    ...rest,
    password: password ? '***' : undefined,
    ssl: !!(ssl || dialectOptions?.ssl),
    dialectOptions: dialectOptions ? '[present]' : undefined,
  };
}


export async function assertDatabaseConnectionOk() {
//   const pass = process.env.PGPASSWORD;
//   const eff = {
//     env,
//     dialect: sequelize.getDialect(),
//     config: {
//       host: (sequelize.config as any).host,
//       port: (sequelize.config as any).port,
//       database: (sequelize.config as any).database,
//       username: (sequelize.config as any).username,
//       password: (sequelize.config as any).password,
//       pool: (sequelize.options as any).pool,
//       schema: (sequelize.options as any).schema,
//       timezone: (sequelize.options as any).timezone,
//       logging: !!sequelize.options.logging,
//       ssl: !!((sequelize.config as any).dialectOptions?.ssl),
//     },
//     rawConfigFile: sanitize(cfg),
//   };
//   console.info('Sequelize connection settings:', eff);


  try {
    await sequelize.authenticate();
    // Optional: also run a trivial query
    await sequelize.query('SELECT 1');
    console.log('✅ DB connection OK');
  } catch (err) {
    console.error('❌ Unable to connect:', {
      name: err?.name,
      message: err?.message,
      code: err?.original?.code,          // e.g., 28P01 for bad password
      detail: err?.original?.detail,
      where: err?.original?.where,
      hint: err?.original?.hint,
    });
    throw err;
  }
}

export async function closeDatabase() {
  await sequelize.close();
}
