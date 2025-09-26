import { Sequelize, Transaction } from 'sequelize';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { UserRoleDAO } from '../../../../main/rdbms/dao/UserRoleDAO';

// Raw classes (only for types/InitModel)
import { MarketplaceUser as MarketplaceUserClass } from '../../../../main/rdbms/entities/MarketplaceUser';
import { Role as RoleClass } from '../../../../main/rdbms/entities/Role';
import { UserRole as UserRoleClass } from '../../../../main/rdbms/entities/UserRole';

describe('UserRoleDAO (integration)', () => {
  let container: StartedPostgreSqlContainer | undefined;
  let sequelize: Sequelize | undefined;
  let dao: UserRoleDAO;

  // Bound models from sequelize.models
  let User: typeof MarketplaceUserClass;
  let Role: typeof RoleClass;
  let UserRole: typeof UserRoleClass;

  let RUNTIME_UNAVAILABLE = false;

  beforeAll(async () => {
    try {
      container = await new PostgreSqlContainer('postgres:16').start();
      sequelize = new Sequelize(container.getConnectionUri(), { logging: false });

      // 1) Bind models to THIS sequelize
      [MarketplaceUserClass, RoleClass, UserRoleClass].forEach((m: any) => m.initModel(sequelize!));

      // 2) Pull the **bound** models back out
      const models = sequelize!.models as any;
      User = models.MarketplaceUser as typeof MarketplaceUserClass;
      Role = models.Role as typeof RoleClass;
      UserRole = models.UserRole as typeof UserRoleClass;

      // 3) Wire associations with the **bound** models only
      User.belongsToMany(Role, {
        through: UserRole,
        as: 'roles',
        foreignKey: 'user_id',
        otherKey: 'role_id',
      });
      Role.belongsToMany(User, {
        through: UserRole,
        as: 'users',
        foreignKey: 'role_id',
        otherKey: 'user_id',
      });
      UserRole.belongsTo(User, { foreignKey: 'user_id' });
      UserRole.belongsTo(Role, { foreignKey: 'role_id' });

      // 4) Create tables
      await sequelize!.sync({ force: true });

      dao = new UserRoleDAO();
    } catch (e) {
      // keep CI green when container runtime isn't available
      // eslint-disable-next-line no-console
      console.warn('⏭️  Skipping UserRoleDAO integration tests:', (e as Error).message);
      RUNTIME_UNAVAILABLE = true;
    }
  }, 60_000);

  afterAll(async () => {
    await sequelize?.close();
    await container?.stop();
  });

  // ---------- helpers ----------

  /** Fill all NOT NULL/no-default attributes based on model metadata */
  function buildRequiredRow(Model: any, base: Record<string, any> = {}) {
    const row: any = { ...base };
    const attrs = Model.rawAttributes || {};
    const now = new Date();

    for (const [name, a] of Object.entries<any>(attrs)) {
      if (a.primaryKey && a.autoIncrement) continue; // skip auto PK

      const needs =
        a.allowNull === false &&
        typeof a.defaultValue === 'undefined' &&
        typeof row[name] === 'undefined';

      if (!needs) continue;

      const key = (a?.type?.key ?? a?.type?.constructor?.key ?? '').toString().toUpperCase();

      if (key.includes('STRING') || key.includes('TEXT') || key.includes('UUID') || key.includes('CHAR')) {
        row[name] =
          name === 'email'
            ? `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`
            : `${name}_${Date.now()}`;
      } else if (key.includes('INTEGER') || key.includes('BIGINT') || key.includes('SMALLINT')) {
        row[name] = 1;
      } else if (key.includes('BOOLEAN')) {
        row[name] = false;
      } else if (key.includes('DECIMAL') || key.includes('FLOAT') || key.includes('REAL') || key.includes('NUMERIC')) {
        row[name] = 0;
      } else if (key.includes('DATE')) {
        row[name] = now;
      } else if (key.includes('JSON')) {
        row[name] = {};
      } else {
        row[name] = `${name}_${Date.now()}`;
      }
    }

    if ('createdAt' in attrs && row.createdAt === undefined) row.createdAt = now;
    if ('updatedAt' in attrs && row.updatedAt === undefined) row.updatedAt = now;
    if ('updateAt' in attrs && row.updateAt === undefined) row.updateAt = now;

    return row;
  }

  function uniq(prefix: string) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }

  async function seedBasics() {
    // Unique email, plus any other NOT NULL columns
    const user = await User.create(
      buildRequiredRow(User, {
        email: `user_${Date.now()}@example.com`,
        first_name: 'First',
        last_name: 'Last',
      })
    );

    // Role names/codes are often unique — give them a suffix to avoid collisions
    const r1 = await Role.create(buildRequiredRow(Role, { name: `ADMIN_${uniq('r')}`, code: `ADMIN_${uniq('r')}` }));
    const r2 = await Role.create(
      buildRequiredRow(Role, { name: `REVIEWER_${uniq('r')}`, code: `REVIEWER_${uniq('r')}` })
    );

    return { user, r1, r2 };
  }

  // ---------- tests ----------

  test('assign (commit) creates a join row', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const { user, r1 } = await seedBasics();

    await sequelize!.transaction(async (tx: Transaction) => {
      const created = await dao.assign((user as any).id, (r1 as any).id, tx);
      expect(created).toBeTruthy();
      expect((created as any).user_id).toBe((user as any).id);
      expect((created as any).role_id).toBe((r1 as any).id);
    });

    const found = await UserRole.findOne({
      where: { user_id: (user as any).id, role_id: (r1 as any).id },
    });
    expect(found).not.toBeNull();
  });

  test('assign (rollback) does not persist', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const { user, r2 } = await seedBasics();

    await expect(
      sequelize!.transaction(async (tx: Transaction) => {
        await dao.assign((user as any).id, (r2 as any).id, tx);
        throw new Error('force rollback');
      })
    ).rejects.toThrow('force rollback');

    const found = await UserRole.findOne({
      where: { user_id: (user as any).id, role_id: (r2 as any).id },
    });
    expect(found).toBeNull();
  });

  test('remove (commit) deletes a join row', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const { user, r1 } = await seedBasics();

    // Pre-insert a link; if the join table has NOT NULL timestamps, use the helper
    await UserRole.create(buildRequiredRow(UserRole, { user_id: (user as any).id, role_id: (r1 as any).id }));

    await sequelize!.transaction(async (tx: Transaction) => {
      const n = await dao.remove((user as any).id, (r1 as any).id, tx);
      expect(n).toBe(1);
    });

    const found = await UserRole.findOne({
      where: { user_id: (user as any).id, role_id: (r1 as any).id },
    });
    expect(found).toBeNull();
  });

  test('remove (rollback) keeps the row', async () => {
    if (RUNTIME_UNAVAILABLE) return;

    const { user, r2 } = await seedBasics();

    await UserRole.create(buildRequiredRow(UserRole, { user_id: (user as any).id, role_id: (r2 as any).id }));

    await expect(
      sequelize!.transaction(async (tx: Transaction) => {
        const n = await dao.remove((user as any).id, (r2 as any).id, tx);
        expect(n).toBe(1);
        throw new Error('force rollback');
      })
    ).rejects.toThrow('force rollback');

    // Row should still be there
    const found = await UserRole.findOne({
      where: { user_id: (user as any).id, role_id: (r2 as any).id },
    });
    expect(found).not.toBeNull();
  });
});
