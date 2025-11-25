
import { QueryInterface, DataTypes, Op } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('notification_priority', {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    code: { type: DataTypes.STRING(16), allowNull: false, unique: true },
    level: { type: DataTypes.INTEGER, allowNull: false },
  });

  await queryInterface.bulkInsert('notification_priority', [
    { id: 1, code: 'HIGH', level: 1 },
    { id: 2, code: 'MEDIUM', level: 2 },
    { id: 3, code: 'LOW', level: 3 },
  ]);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('notification_priority', { id: { [Op.in]: [1, 2, 3] } }, {});
  await queryInterface.dropTable('notification_priority', { cascade: true });
}
