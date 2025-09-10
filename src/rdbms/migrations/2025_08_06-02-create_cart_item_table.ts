// src/db/migrations/20250908-create-cart-item.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('cart_item', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    request_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: true }, // set a default if you want: defaultValue: 1
  });

  // UNIQUE(product_id, request_id)
  await queryInterface.addConstraint('cart_item', {
    name: 'unique_request_product_for_cart_item',
    type: 'unique',
    fields: ['product_id', 'request_id'],
  });

  // FK: request_id → use_case_request(id)
  await queryInterface.addConstraint('cart_item', {
    name: 'fk_cart_item_request',
    type: 'foreign key',
    fields: ['request_id'],
    references: { table: 'use_case_request', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  });

  // FK: product_id → product(id)
  await queryInterface.addConstraint('cart_item', {
    name: 'fk_cart_item_product',
    type: 'foreign key',
    fields: ['product_id'],
    references: { table: 'product', field: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('cart_item');
}
