// src/db/seeders/20250908-seed-products.ts
import { QueryInterface, Op } from 'sequelize';

const PRODUCTS = [
  'AWS',
  'C3AI',
  'Databricks',
  'DataRobot',
  'Gitlab',
  'Palantir',
  'Tableau',
  'UI Path',
];

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Only "name" is required per your table definition
  await queryInterface.bulkInsert(
    'product',
    PRODUCTS.map((name) => ({ name })),
    {}
  );
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete(
    'product',
    { name: { [Op.in]: PRODUCTS } },
    {}
  );
}
