import { Sequelize } from 'sequelize';
import { sequelize } from '../config/sequelizeCLIConfig.cjs';

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
