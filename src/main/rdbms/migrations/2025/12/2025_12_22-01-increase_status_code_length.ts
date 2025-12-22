// Increase status code field length to accommodate longer status names
import { QueryInterface, DataTypes } from "sequelize";

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.changeColumn("status", "code", {
    type: DataTypes.STRING(32),
    allowNull: false,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.changeColumn("status", "code", {
    type: DataTypes.STRING(16),
    allowNull: false,
  });
}
