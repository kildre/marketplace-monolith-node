import { Sequelize } from 'sequelize';

// Use require because config/config.js is CommonJS
// eslint-disable-next-line @typescript-eslint/no-var-requires


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


export async function assertDatabaseConnectionOk() {
  try {
    await sequelize.authenticate();
    await sequelize.query('SELECT 1');
    console.log('✅ DB connection OK');
  } catch (err: unknown) {
    if (err instanceof Error) {
      // sequelize/pg often nest the driver error under `original`
      const original = (err as any).original as
        | { code?: string; detail?: string; where?: string; hint?: string }
        | undefined;

      console.error('❌ Unable to connect:', {
        name: err.name,
        message: err.message,
        code: original?.code,       // e.g., 28P01
        detail: original?.detail,
        where: original?.where,
        hint: original?.hint,
      });
    } else {
      console.error('❌ Unable to connect:', String(err));
    }
    throw err;
  }
}

export async function closeDatabase() {
  await sequelize.close();
}
