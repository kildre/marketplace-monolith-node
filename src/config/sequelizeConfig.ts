// src/db/sequelize.ts
import 'dotenv/config';
import { Sequelize } from 'sequelize';

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

