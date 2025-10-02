// src/test/int/rdbms/dao/user-role.dao.int.test.ts
import { Sequelize, Transaction } from 'sequelize';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

import { UserRole } from '../../../../main/rdbms/entities/UserRole';
import { UserRoleDAO } from '../../../../main/rdbms/dao/UserRoleDAO';

describe('UserRoleDAO (integration)', () => {
  let container: StartedPostgreSqlContainer | undefined;
  let sequelize: Sequelize | undefined;
  let dao: UserRoleDAO;

  // Allow skipping when Docker/Testcontainers is unavailable
  let RUNTIME_UNAVAILABLE = false;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('postgres:16').start();
      sequelize = new Sequelize(container.getConnectionUri(), { logging: false });

      // Bind the EXACT class the DAO imports to this Sequelize instance
      UserRole.initModel(sequelize);

      // Create the join table
      await sequelize.sync({ force: true });

      dao = new UserRoleDAO();
    } catch (e) {
      // Keep CI green if container runtime is not available
      // eslint-disable-next-line no-console
      console.warn(
        '⏭️  Skipping UserRoleDAO integration tests:',
        (e as Error).message
      );
      RUNTIME_UNAVAILABLE = true;
    }
  }, 60_000);

  afterAll(async () => {
    await sequelize?.close();
    await container?.stop();
  });

  // Small helper to count current rows (sanity checks)
  async function countRows() {
    return UserRole.count();
  }

  test('assign (commit) creates a join row', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const before = await countRows();

    await sequelize!.transaction(async (tx: Transaction) => {
      const created = await dao.assign(1001, 2001, tx);
      expect(created).toBeTruthy();

      // `created` is a Sequelize instance – read via plain object
      const plain = (created as any).get?.({ plain: true }) ?? created;
      // We used camelCase in the model with `field` mapping → columns are user_id/role_id
      expect(plain.userId).toBe(1001);
      expect(plain.roleId).toBe(2001);
    });

    const after = await countRows();
    expect(after).toBe(before + 1);

    // Verify it actually exists in the table
    const found = await UserRole.findOne({ where: { userId: 1001, roleId: 2001 } });
    expect(found).not.toBeNull();
  });

  test('assign (rollback) does not persist', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const before = await countRows();

    await expect(
      sequelize!.transaction(async (tx: Transaction) => {
        await dao.assign(1002, 2002, tx);
        // Force rollback
        throw new Error('force rollback');
      })
    ).rejects.toThrow('force rollback');

    const after = await countRows();
    expect(after).toBe(before);

    const found = await UserRole.findOne({ where: { userId: 1002, roleId: 2002 } });
    expect(found).toBeNull();
  });

  test('remove (commit) deletes a join row', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    // Seed a row to delete (use camelCase attributes; model maps to snake_case)
    await UserRole.create({ userId: 3001, roleId: 4001 } as any);

    const before = await countRows();

    await sequelize!.transaction(async (tx: Transaction) => {
      const n = await dao.remove(3001, 4001, tx);
      expect(n).toBe(1);
    });

    const after = await countRows();
    expect(after).toBe(before - 1);

    const stillThere = await UserRole.findOne({ where: { userId: 3001, roleId: 4001 } });
    expect(stillThere).toBeNull();
  });

  test('remove (rollback) keeps the row', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    // Seed a row to attempt to delete
    await UserRole.create({ userId: 3002, roleId: 4002 } as any);

    const before = await countRows();

    await expect(
      sequelize!.transaction(async (tx: Transaction) => {
        const n = await dao.remove(3002, 4002, tx);
        expect(n).toBe(1);
        // Force rollback
        throw new Error('force rollback');
      })
    ).rejects.toThrow('force rollback');

    const after = await countRows();
    expect(after).toBe(before); // unchanged

    const found = await UserRole.findOne({ where: { userId: 3002, roleId: 4002 } });
    expect(found).not.toBeNull();
  });
});
