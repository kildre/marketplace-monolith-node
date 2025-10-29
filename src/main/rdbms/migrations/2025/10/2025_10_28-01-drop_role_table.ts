import { QueryInterface, DataTypes, Op } from 'sequelize';

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('role', {
    id: { type: DataTypes.SMALLINT, primaryKey: true },
    code: { type: DataTypes.STRING(16), allowNull: false, unique: true },
  });

  // seed initial roles
  await queryInterface.bulkInsert('role', [
    { id: 1, code: 'ADJUDICATOR' },
    { id: 2, code: 'REQUESTOR' },
  ]);
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete('role', { id: { [Op.in]: [1, 2] } }, {});
  await queryInterface.dropTable('role', { cascade: true });
}
