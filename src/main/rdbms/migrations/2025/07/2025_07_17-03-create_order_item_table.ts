// src/db/migrations/20250908-create-order-item.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('order_item', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    justification: { type: DataTypes.STRING(1024), allowNull: false },
  });

  // FK: order_item.order_id -> marketplace_order.id
  await queryInterface.addConstraint('order_item', {
    name: 'fk_oi_order',
    type: 'foreign key',
    fields: ['order_id'],
    references: { table: 'marketplace_order', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  // FK: order_item.product_id -> product.id
  await queryInterface.addConstraint('order_item', {
    name: 'fk_oi_product',
    type: 'foreign key',
    fields: ['product_id'],
    references: { table: 'product', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('order_item');
}
