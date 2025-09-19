// ---- Mocks ----
jest.mock('../../../../rdbms/entities/MarketplaceUser', () => {
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

jest.mock('../../../../rdbms/entities/Role', () => {
  class Role {
    static findAll = jest.fn();
    static findByPk = jest.fn();
  }
  return { Role };
});

// ---- Imports ----
import { MarketplaceUser } from '../../../../rdbms/entities/MarketplaceUser';
import { Role } from '../../../../rdbms/entities/Role';
import { MarketplaceUserDAO } from '../../../../rdbms/dao/MarketplaceUserDAO';

describe('MarketplaceUserDAO', () => {
  const dao = new MarketplaceUserDAO();
  const tx = Symbol('tx') as any; // distinct sentinel for easier call assertions

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('findByEmail', async () => {
    (MarketplaceUser.findOne as any).mockResolvedValue({ id: 1, email: 'a@b.com' });

    const user = await dao.findByEmail('a@b.com');

    expect(MarketplaceUser.findOne).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
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
