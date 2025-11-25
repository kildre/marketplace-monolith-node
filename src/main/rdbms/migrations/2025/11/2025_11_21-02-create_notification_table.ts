// src/db/migrations/20250908-create-use-case-request.ts
import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    title: { type: DataTypes.STRING(128), allowNull: false },
    message: { type: DataTypes.STRING(2048), allowNull: false },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },

    notification_priority_id: { type: DataTypes.SMALLINT, allowNull: false },
  });

  // FK: status_id -> status.id
  await queryInterface.addConstraint('notification', {
    name: 'fk_notification_priority',
    type: 'foreign key',
    fields: ['notification_priority_id'],
    references: { table: 'notification_priority', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('notification', { cascade: true });
}
