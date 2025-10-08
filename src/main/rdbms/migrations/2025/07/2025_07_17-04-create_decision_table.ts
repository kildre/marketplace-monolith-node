// src/db/migrations/20250908-create-decision.ts
import { QueryInterface, DataTypes, Sequelize } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Note: unquoted "Decision" becomes lowercase "decision" in Postgres.
  await queryInterface.createTable('decision', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

    decision_number: { type: DataTypes.STRING(32), allowNull: false, unique: true },

    adjudicator_id: { type: DataTypes.INTEGER, allowNull: false },
    request_id:     { type: DataTypes.INTEGER, allowNull: false },
    order_id:       { type: DataTypes.INTEGER, allowNull: true },

    // Match status.id type (SMALLINT)
    status_id:      { type: DataTypes.SMALLINT, allowNull: false },

    ticket_type:    { type: DataTypes.STRING(64),  allowNull: true },
    asset:          { type: DataTypes.STRING(128), allowNull: true },
    quantity:       { type: DataTypes.INTEGER,     allowNull: true },
    estimated_price:{ type: DataTypes.DECIMAL(18, 2), allowNull: true },

    created_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    updated_at:  { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    decision_at: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },

    comments: { type: DataTypes.STRING(1024), allowNull: false },
  });

  // FK: decision.adjudicator_id -> marketplace_user.id
  await queryInterface.addConstraint('decision', {
    name: 'fk_decision_adjudicator',
    type: 'foreign key',
    fields: ['adjudicator_id'],
    references: { table: 'marketplace_user', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // FK: decision.request_id -> use_case_request.id
  await queryInterface.addConstraint('decision', {
    name: 'fk_decision_request',
    type: 'foreign key',
    fields: ['request_id'],
    references: { table: 'use_case_request', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });

  // FK: decision.order_id -> marketplace_order.id
  await queryInterface.addConstraint('decision', {
    name: 'fk_decision_order',
    type: 'foreign key',
    fields: ['order_id'],
    references: { table: 'marketplace_order', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  });

  // FK: decision.status_id -> status.id
  await queryInterface.addConstraint('decision', {
    name: 'fk_decision_status',
    type: 'foreign key',
    fields: ['status_id'],
    references: { table: 'status', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('decision');
}
