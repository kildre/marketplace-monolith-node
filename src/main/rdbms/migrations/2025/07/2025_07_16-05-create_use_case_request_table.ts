// src/db/migrations/20250908-create-use-case-request.ts
import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('use_case_request', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    request_number: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    requestor_id: { type: DataTypes.INTEGER, allowNull: false },

    designation: { type: DataTypes.STRING(128), allowNull: true },
    agency: { type: DataTypes.STRING(128), allowNull: true },
    organization: { type: DataTypes.STRING(128), allowNull: true },
    other_organization: { type: DataTypes.STRING(128), allowNull: true },
    point_of_contact: { type: DataTypes.STRING(128), allowNull: true },
    phone_number: { type: DataTypes.STRING(32), allowNull: true },
    email: { type: DataTypes.STRING(128), allowNull: true },
    estimated_rom: { type: DataTypes.STRING(32), allowNull: true },

    requested_tool_name: { type: DataTypes.STRING(128), allowNull: false },
    description: { type: DataTypes.STRING(1024), allowNull: false },

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

    // match status.id (SMALLINT)
    status_id: { type: DataTypes.SMALLINT, allowNull: false },
  });

  // FK: requestor_id -> marketplace_user.id
  await queryInterface.addConstraint('use_case_request', {
    name: 'fk_ucr_requestor',
    type: 'foreign key',
    fields: ['requestor_id'],
    references: { table: 'marketplace_user', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // FK: status_id -> status.id
  await queryInterface.addConstraint('use_case_request', {
    name: 'fk_ucr_status',
    type: 'foreign key',
    fields: ['status_id'],
    references: { table: 'status', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // (optional) indexes for lookups
  // await queryInterface.addIndex('use_case_request', ['requestor_id']);
  // await queryInterface.addIndex('use_case_request', ['status_id']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('use_case_request');
}
