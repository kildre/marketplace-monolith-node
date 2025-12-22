// Add additional status values for workflow tracking
import { QueryInterface, Op } from "sequelize";

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkInsert("status", [
    { id: 4, code: "ROM_GENERATED" },
    { id: 5, code: "MIPR_NEEDED" },
    { id: 6, code: "PROCURING_PRODUCTS" },
    { id: 7, code: "ALLOCATION_PENDING" },
    { id: 8, code: "COMPLETE" },
  ]);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.bulkDelete(
    "status",
    { id: { [Op.in]: [4, 5, 6, 7, 8] } },
    {}
  );
}
