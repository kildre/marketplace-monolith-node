// src/db/sequelize.ts
import 'dotenv/config';
import { Sequelize } from 'sequelize';
import { rdbmsDatabase, rdbmsDriver, rdbmsHost, rdbmsPassword, rdbmsPort, rdbmsUser } from './services/rdbmsConfigService';

export const sequelize = new Sequelize(
  rdbmsDatabase,
  rdbmsUser,
  rdbmsPassword,
  {
    host: rdbmsHost,
    port: rdbmsPort,
    dialect: rdbmsDriver as any,
    logging: false,
  }
);

