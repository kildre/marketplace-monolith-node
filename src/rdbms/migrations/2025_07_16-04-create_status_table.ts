// src/db/migrations/20250908-create-status.ts
import { QueryInterface, DataTypes, Op } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('status', {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    code: { type: DataTypes.STRING(16), allowNull: false, unique: true },
  });

  await queryInterface.bulkInsert('status', [
    { id: 1, code: 'PENDING' },
    { id: 2, code: 'APPROVED' },
    { id: 3, code: 'DENIED' },
  ]);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('status', { id: { [Op.in]: [1, 2, 3] } }, {});
  await queryInterface.dropTable('status');
}
