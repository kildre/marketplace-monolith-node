// src/test/unit/rdbms/dao/MarketplaceUserDAO.unit.test.ts

// ---- Mocks ----
jest.mock('../../../../main/rdbms/entities/MarketplaceUser', () => {
  class MarketplaceUser {
    static create = jest.fn();
    static findByPk = jest.fn();
    static findOne = jest.fn();
    static findAll = jest.fn();
    $add = jest.fn();
    $remove = jest.fn();
  }
  return { MarketplaceUser };
});

jest.mock('../../../../main/rdbms/entities/Role', () => {
  class Role {
    static findAll = jest.fn();
    static findByPk = jest.fn();
  }
  return { Role };
});

// Optional: silence noisy console logs from sequelize config (if imported anywhere)
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

// ---- Imports ----
import { MarketplaceUser } from '../../../../main/rdbms/entities/MarketplaceUser';
import { Role } from '../../../../main/rdbms/entities/Role';
import { MarketplaceUserDAO } from '../../../../main/rdbms/dao/MarketplaceUserDAO';

describe('MarketplaceUserDAO', () => {
  const dao = new MarketplaceUserDAO();
  const tx = Symbol('tx') as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findByEmail', async () => {
    (MarketplaceUser.findOne as any).mockResolvedValue({ id: 1, email: 'a@b.com' });

    const user = await dao.findByEmail('a@b.com');

    // Inspect the actual argument to avoid brittle deep-equality on Sequelize internals
    const callArg = (MarketplaceUser.findOne as jest.Mock).mock.calls[0][0];

    // transaction is optional/undefined by default
    expect(callArg.transaction).toBeUndefined();

    // Assert key pieces of the case-insensitive where:
    expect(callArg.where).toBeDefined();
    expect(callArg.where.comparator).toBe('=');
    expect(callArg.where.logic).toBe('a@b.com');
    // left-hand side should be lower(col('email'))
    expect(callArg.where.attribute.fn).toBe('lower');
    expect(callArg.where.attribute.args[0].col).toBe('email');

    expect(user).toEqual({ id: 1, email: 'a@b.com' });
  });

  test('getWithRoles includes roles', async () => {
    (MarketplaceUser.findByPk as any).mockResolvedValue({ id: 1, email: 'a@b.com' });

    const user = await dao.getWithRoles(1);

    expect(MarketplaceUser.findByPk).toHaveBeenCalledWith(1, {
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
    });
    expect(user).toEqual({ id: 1, email: 'a@b.com' });
  });

  test('addRoles uses $add with found roles (managed tx)', async () => {
    const instance: any = new (MarketplaceUser as any)();
    instance.$add = jest.fn();

    (MarketplaceUser.findByPk as any).mockResolvedValue(instance);
    (Role.findAll as any).mockResolvedValue([{ id: 10 }, { id: 11 }]);

    await dao.addRoles(1, [10, 11], { transaction: tx });

    expect(MarketplaceUser.findByPk).toHaveBeenCalledWith(1, { transaction: tx });
    expect(Role.findAll).toHaveBeenCalledWith({ where: { id: [10, 11] }, transaction: tx });
    expect(instance.$add).toHaveBeenCalledWith('roles', [{ id: 10 }, { id: 11 }], { transaction: tx });
  });

  test('removeRole uses $remove when found (managed tx)', async () => {
    const instance: any = new (MarketplaceUser as any)();
    instance.$remove = jest.fn();

    (MarketplaceUser.findByPk as any).mockResolvedValue(instance);
    (Role.findByPk as any).mockResolvedValue({ id: 10 });

    await dao.removeRole(1, 10, { transaction: tx });

    expect(MarketplaceUser.findByPk).toHaveBeenCalledWith(1, { transaction: tx });
    expect(Role.findByPk).toHaveBeenCalledWith(10, { transaction: tx });
    expect(instance.$remove).toHaveBeenCalledWith('roles', { id: 10 }, { transaction: tx });
  });
});
