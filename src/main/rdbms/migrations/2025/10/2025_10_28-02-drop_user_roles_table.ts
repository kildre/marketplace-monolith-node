// src/db/migrations/20250908-create-user-roles.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function down(queryInterface: QueryInterface): Promise<void> {
  // 1) create table
  await queryInterface.createTable('user_roles', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    role_id: { type: DataTypes.SMALLINT, allowNull: false },
  });

  // 2) composite primary key
  await queryInterface.addConstraint('user_roles', {
    name: 'pk_user_roles',
    type: 'primary key',
    fields: ['user_id', 'role_id'],
  });

  // 3) FK: user_roles.user_id -> marketplace_user.id
  await queryInterface.addConstraint('user_roles', {
    name: 'fk_user_roles_user',
    type: 'foreign key',
    fields: ['user_id'],
    references: { table: 'marketplace_user', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  // 4) FK: user_roles.role_id -> role.id
  await queryInterface.addConstraint('user_roles', {
    name: 'fk_user_roles_role',
    type: 'foreign key',
    fields: ['role_id'],
    references: { table: 'role', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });
}

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('user_roles', { cascade: true });
}
