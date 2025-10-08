// src/db/seeders/20250908-seed-authorized-users.ts
import { QueryInterface, Op } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const users = [
    { email: 'jennifer.a.cowley.civ@mail.mil', first_name: 'Jennifer', last_name: 'Cowley' },
    { email: 'jane.f.roberts.civ@mail.mil',     first_name: 'Jane',     last_name: 'Roberts' },
    { email: 'vinoth.jagannathan.civ@mail.mil', first_name: 'Vinoth',   last_name: 'Jagannathan' },
    { email: 'joanna.c.ramsey.civ@mail.mil',    first_name: 'Joanna',   last_name: 'Ramsey' },
    { email: 'elizabeth.y.ahn.civ@mail.mil',    first_name: 'Elizabeth',last_name: 'Ahn' },
    { email: 'daniel.e.allen.civ@mail.mil',     first_name: 'Daniel',   last_name: 'Allen' },
  ];

  const emails = users.map(u => u.email);

  // Insert users
  await queryInterface.bulkInsert('marketplace_user', users, {});

  // Fetch their IDs
  const inList = emails.map(e => `'${e.replace(/'/g, "''")}'`).join(',');
  const sql = `
    SELECT id, email
    FROM marketplace_user
    WHERE email IN (${inList})
  `;

  const [rowsRaw] = await queryInterface.sequelize.query(sql);
  const rows = rowsRaw as Array<{ id: number; email: string }>;
  const byEmail = new Map(rows.map(r => [r.email, r.id]));

  // Map desired roles:
  // 1 = ADJUDICATOR, 2 = REQUESTOR (adjust to your role IDs)
  const rolePairs: Array<[string, number]> = [
    ['jennifer.a.cowley.civ@mail.mil', 1],
    ['jane.f.roberts.civ@mail.mil',    1],
    ['vinoth.jagannathan.civ@mail.mil',2],
    ['joanna.c.ramsey.civ@mail.mil',   1],
    ['elizabeth.y.ahn.civ@mail.mil',   2],
    ['daniel.e.allen.civ@mail.mil',    2],
  ];

  const userRoles = rolePairs
    .map(([email, role_id]) => {
      const user_id = byEmail.get(email);
      if (!user_id) return null; // user insert failed somehow — skip to be safe
      return { user_id, role_id };
    })
    .filter((x): x is { user_id: number; role_id: number } => !!x);

  if (userRoles.length) {
    await queryInterface.bulkInsert('user_roles', userRoles, {});
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const emails = [
    'jennifer.a.cowley.civ@mail.mil',
    'jane.f.roberts.civ@mail.mil',
    'vinoth.jagannathan.civ@mail.mil',
    'joanna.c.ramsey.civ@mail.mil',
    'elizabeth.y.ahn.civ@mail.mil',
    'daniel.e.allen.civ@mail.mil',
  ];

  // Look up the user IDs again to clean user_roles safely
  const inList = emails.map(e => `'${e.replace(/'/g, "''")}'`).join(',');
  const sql = `
    SELECT id
    FROM marketplace_user
    WHERE email IN (${inList})
  `;
  const [rowsRaw] = await queryInterface.sequelize.query(sql);
  const rows = rowsRaw as Array<{ id: number }>;
  const ids = rows.map(r => r.id);

  // Remove just the user_roles for these users
  if (ids.length) {
    await queryInterface.bulkDelete('user_roles', { user_id: { [Op.in]: ids } }, {});
  }

  // Remove the inserted users
  await queryInterface.bulkDelete(
    'marketplace_user',
    { email: { [Op.in]: emails } },
    {}
  );
}
