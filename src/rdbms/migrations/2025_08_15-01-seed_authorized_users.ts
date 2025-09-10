// src/db/seeders/20250908-seed-more-users.ts
import { QueryInterface, Op, QueryTypes } from 'sequelize';

type Row = { id: number; email: string };

const USERS = [
  { email: 'slair@metrostar.com',             first_name: 'Samuel',    last_name: 'Lair',    role_id: 2 },
  { email: 'kilian.l.berres.ctr@mail.mil',    first_name: 'Killian',   last_name: 'Berres',  role_id: 1 },
  { email: 'kberres@metrostar.com',           first_name: 'Killian',   last_name: 'Berres',  role_id: 2 },
  { email: 'jbapple@metrostar.com',           first_name: 'Jake',      last_name: 'Bapple',  role_id: 2 },
  { email: 'efernald@metrostar.com',          first_name: 'Eric',      last_name: 'Fernald', role_id: 2 },
  { email: 'eric.j.fernald2.ctr@mail.mil',    first_name: 'Eric',      last_name: 'Fernald', role_id: 1 },
  { email: 'aleksander.s.wilms.ctr@mail.mil', first_name: 'Aleksander',last_name: 'Wilms',   role_id: 1 },
];

export async function up(queryInterface: QueryInterface): Promise<void> {
  // 1) Insert users (only necessary columns)
  await queryInterface.bulkInsert(
    'marketplace_user',
    USERS.map(({ email, first_name, last_name }) => ({ email, first_name, last_name })),
    {}
  );

  // 2) Fetch their ids (safe replacements)
  const emails = USERS.map(u => u.email);
  const rows = (await queryInterface.sequelize.query<Row>(
    `SELECT id, email FROM marketplace_user WHERE email IN (:emails)`,
    { replacements: { emails }, type: QueryTypes.SELECT }
  )) as Row[];

  const byEmail = new Map(rows.map(r => [r.email, r.id]));

  // 3) Insert user_roles
  const userRoles = USERS
    .map(u => {
      const user_id = byEmail.get(u.email);
      return user_id ? { user_id, role_id: u.role_id } : null;
    })
    .filter((x): x is { user_id: number; role_id: number } => !!x);

  if (userRoles.length) {
    await queryInterface.bulkInsert('user_roles', userRoles, {});
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const emails = USERS.map(u => u.email);

  // Lookup IDs again to delete only these user_roles
  const rows = (await queryInterface.sequelize.query<Row>(
    `SELECT id, email FROM marketplace_user WHERE email IN (:emails)`,
    { replacements: { emails }, type: QueryTypes.SELECT }
  )) as Row[];

  const ids = rows.map(r => r.id);

  if (ids.length) {
    await queryInterface.bulkDelete('user_roles', { user_id: { [Op.in]: ids } }, {});
  }

  await queryInterface.bulkDelete('marketplace_user', { email: { [Op.in]: emails } }, {});
}
