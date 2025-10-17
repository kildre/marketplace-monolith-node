// src/db/migrations/20250908-create-product.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    vendor: { type: DataTypes.STRING(128), allowNull: true },
    description: { type: DataTypes.STRING(1024), allowNull: true },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('product');
}
