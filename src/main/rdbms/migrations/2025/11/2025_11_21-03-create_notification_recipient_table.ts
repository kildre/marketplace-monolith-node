// src/db/migrations/20250908-create-user-roles.ts
import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // 1) create table
  await queryInterface.createTable('notification_recipient', {
    notification_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'notification', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
    },
    recipient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: { model: 'marketplace_user', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
     },
    read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    hidden: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },

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
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('notification_recipient', { cascade: true });
}
