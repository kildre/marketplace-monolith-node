// src/db/migrations/20250908-create-marketplace-order.ts
import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('marketplace_order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    requestor_id: { type: DataTypes.INTEGER, allowNull: true },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    // match status.id (SMALLINT)
    status_id: { type: DataTypes.SMALLINT, allowNull: true },
  });

  await queryInterface.addConstraint('marketplace_order', {
    name: 'fk_mo_requestor',
    type: 'foreign key',
    fields: ['requestor_id'],
    references: { table: 'marketplace_user', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  await queryInterface.addConstraint('marketplace_order', {
    name: 'fk_mo_status',
    type: 'foreign key',
    fields: ['status_id'],
    references: { table: 'status', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('marketplace_order');
}
