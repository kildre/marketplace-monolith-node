// src/db/seeders/20250908-seed-authorized-users.ts
import { QueryInterface, Op } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const users = [
    { email: 'pkonka@metrostar.com', first_name: 'Prasad', last_name: 'Konka' },
    { email: 'prasad.v.konka.ctr@usmc.mil',     first_name: 'Prasad',     last_name: 'Konka' },
  ];

  const emails = users.map(u => u.email);

  // Insert users
  await queryInterface.bulkInsert('marketplace_user', users, {});
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const emails = [
    'pkonka@metrostar.com',
    'prasad.v.konka.ctr@usmc.mil',
  ];

  // Look up the user IDs again to clean user_roles safely
  const inList = emails.map(e => `'${e.replace(/'/g, "''")}'`).join(',');

  // Remove the inserted users
  await queryInterface.bulkDelete(
    'marketplace_user',
    { email: { [Op.in]: emails } },
    {}
  );
}
