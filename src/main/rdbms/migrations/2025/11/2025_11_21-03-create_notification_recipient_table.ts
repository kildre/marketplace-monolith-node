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

  // 2) composite primary key
//   await queryInterface.addConstraint('notification_recipient', {
//     name: 'pk_notification_recipient',
//     type: 'primary key',
//     fields: ['notification_id', 'recipient_id'],
//   });

  // 3) FK: user_roles.user_id -> marketplace_user.id
//   await queryInterface.addConstraint('notification_recipient', {
//     name: 'fk_notification_recipient_recipient',
//     type: 'foreign key',
//     fields: ['recipient_id'],
//     references: { table: 'marketplace_user', field: 'id' },
//     onUpdate: 'CASCADE',
//     onDelete: 'RESTRICT',
//   });

  // 4) FK: user_roles.role_id -> role.id
//   await queryInterface.addConstraint('notification_recipient', {
//     name: 'fk_notification_recipient_notification',
//     type: 'foreign key',
//     fields: ['notification_id'],
//     references: { table: 'notification', field: 'id' },
//     onUpdate: 'CASCADE',
//     onDelete: 'RESTRICT',
//   });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('notification_recipient', { cascade: true });
}
