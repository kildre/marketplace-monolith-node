// migrations/20250908-create-marketplace-user.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('marketplace_user', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING(128), allowNull: false, unique: true },
    advana_user_id: { type: DataTypes.STRING(128), allowNull: true, unique: true },
    first_name: { type: DataTypes.STRING(64) },
    last_name: { type: DataTypes.STRING(64) },
    agency: { type: DataTypes.STRING(128) },
    designation: { type: DataTypes.STRING(128) },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('marketplace_user');
}
