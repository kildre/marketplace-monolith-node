// src/test/unit/rdbms/dao/MarketplaceUserDAO.unit.test.ts

// ---- Mocks for entities ----
jest.mock('../../../../main/rdbms/entities/MarketplaceUser', () => {
  class MarketplaceUser {
    static findByPk = jest.fn();
    static findOne = jest.fn();
    static count = jest.fn();
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

// ---- Mock the managed transaction source used by DAO ----
jest.mock('../../../../main/config/sequelizeCLIConfig.cjs', () => {
  return {
    __esModule: true,
    sequelize: {
      transaction: jest.fn(async (fn: any) => {
        const fakeTx = { __tx: true };
        return fn(fakeTx);
      }),
    },
  };
});

// ---- Imports under test ----
import { MarketplaceUserDAO } from '../../../../main/rdbms/dao/MarketplaceUserDAO';
import { MarketplaceUser } from '../../../../main/rdbms/entities/MarketplaceUser';
import { Role } from '../../../../main/rdbms/entities/Role';
import { sequelize } from '../../../../main/config/sequelizeCLIConfig.cjs';

// also import Sequelize helpers so we can build the same `where(fn(lower(col('email'))), e)`
import { where as sWhere, fn as sFn, col as sCol } from 'sequelize';

describe('MarketplaceUserDAO (unit)', () => {
  const dao = new MarketplaceUserDAO();
  const tx = { name: 'providedTx' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- findByEmail ----------
  it('findByEmail trims + lowercases email, builds where(lower(email)) equals e, passes options', async () => {
    const row = { id: 1, email: 'a@b.com' };
    (MarketplaceUser.findOne as any).mockResolvedValue(row);

    const res = await dao.findByEmail('  A@B.com  ', {
      transaction: tx,
      attributes: ['id', 'email'],
      paranoid: false,
    } as any);

    expect(MarketplaceUser.findOne).toHaveBeenCalledTimes(1);
    const arg = (MarketplaceUser.findOne as any).mock.calls[0][0];

    // email should be lowercased in the where clause; we can build the expected Sequelize where object
    const expectedWhere = sWhere(sFn('lower', sCol('email')), 'a@b.com');
    expect(arg.where).toEqual(expectedWhere);

    // options merged
    expect(arg.transaction).toBe(tx);
    expect(arg.attributes).toEqual(['id', 'email']);
    expect(arg.paranoid).toBe(false);

    expect(res).toBe(row);
  });

  it('findByEmail throws if email is missing/blank', async () => {
    await expect(dao.findByEmail('')).rejects.toThrow(/email is required/i);
    await expect(dao.findByEmail('   ')).rejects.toThrow(/email is required/i);
    // @ts-expect-error test undefined
    await expect(dao.findByEmail(undefined)).rejects.toThrow(/email is required/i);
  });

  // ---------- getWithRoles ----------
  it('getWithRoles includes roles (through attributes stripped) and passes options', async () => {
    const row = { id: 2 };
    (MarketplaceUser.findByPk as any).mockResolvedValue(row);

    const out = await dao.getWithRoles(2, {
      transaction: tx,
      attributes: ['id'],
      paranoid: false,
    });

    expect(MarketplaceUser.findByPk).toHaveBeenCalledWith(2, expect.objectContaining({
      include: [
        { model: Role, as: 'roles', through: { attributes: [] } },
      ],
      transaction: tx,
      attributes: ['id'],
      paranoid: false,
    }));
    expect(out).toBe(row);
  });

  // ---------- addRoles ----------
  it('addRoles: throws when user not found (managed tx path)', async () => {
    (MarketplaceUser.findByPk as any).mockResolvedValue(null);

    await expect(
      dao.addRoles(99, [1, 2])
    ).rejects.toThrow(/user not found/i);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
  });

  it('addRoles: adds roles when user found (provided tx path)', async () => {
    const userInstance = { $add: jest.fn() };
    (MarketplaceUser.findByPk as any).mockResolvedValue(userInstance);
    const roles = [{ id: 1 }, { id: 2 }];
    (Role.findAll as any).mockResolvedValue(roles);

    await dao.addRoles(7, [1, 2], { transaction: tx });

    expect(sequelize.transaction).not.toHaveBeenCalled(); // provided tx path
    expect(MarketplaceUser.findByPk).toHaveBeenCalledWith(7, { transaction: tx });
    expect(Role.findAll).toHaveBeenCalledWith({ where: { id: [1, 2] }, transaction: tx });
    expect(userInstance.$add).toHaveBeenCalledWith('roles', roles, { transaction: tx });
  });

  it('addRoles: adds roles with managed tx when no tx provided', async () => {
    const userInstance = { $add: jest.fn() };
    (MarketplaceUser.findByPk as any).mockResolvedValue(userInstance);
    (Role.findAll as any).mockResolvedValue([{ id: 3 }]);

    await dao.addRoles(5, [3]);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    const managedTx = (sequelize.transaction as jest.Mock).mock.calls[0]?.[0]; // first arg is fn
    // We can't easily read the tx object passed into fn, but we can assert DAO forwarded it by seeing our mocks got 'transaction: {__tx: true}'
    const userCall = (MarketplaceUser.findByPk as jest.Mock).mock.calls.find(c => c[0] === 5);
    expect(userCall?.[1]).toEqual(expect.objectContaining({ transaction: expect.any(Object) }));

    const addArgs = (userInstance.$add as jest.Mock).mock.calls[0][2];
    expect(addArgs).toEqual(expect.objectContaining({ transaction: expect.any(Object) }));
  });

  // ---------- removeRole ----------
  it('removeRole: throws when user not found (managed tx path)', async () => {
    (MarketplaceUser.findByPk as any).mockResolvedValue(null);

    await expect(
      dao.removeRole(1, 2)
    ).rejects.toThrow(/user not found/i);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
  });

  it('removeRole: returns early when role not found (no $remove)', async () => {
    const userInstance = { $remove: jest.fn() };
    (MarketplaceUser.findByPk as any).mockResolvedValue(userInstance);
    (Role.findByPk as any).mockResolvedValue(null);

    await dao.removeRole(1, 2, { transaction: tx });

    expect(sequelize.transaction).not.toHaveBeenCalled();
    expect(userInstance.$remove).not.toHaveBeenCalled();
  });

  it('removeRole: removes role when both exist (provided tx path)', async () => {
    const userInstance = { $remove: jest.fn() };
    const roleInstance = { id: 2 };
    (MarketplaceUser.findByPk as any).mockResolvedValue(userInstance);
    (Role.findByPk as any).mockResolvedValue(roleInstance);

    await dao.removeRole(10, 2, { transaction: tx });

    expect(MarketplaceUser.findByPk).toHaveBeenCalledWith(10, { transaction: tx });
    expect(Role.findByPk).toHaveBeenCalledWith(2, { transaction: tx });
    expect(userInstance.$remove).toHaveBeenCalledWith('roles', roleInstance, { transaction: tx });
  });

  // ---------- existsByEmailAndRoleId ----------
  it('existsByEmailAndRoleId: true when count > 0 (provided tx path)', async () => {
    (MarketplaceUser.count as any).mockResolvedValue(3);

    const ok = await dao.existsByEmailAndRoleId('x@y.com', 7, { transaction: tx });
    expect(ok).toBe(true);

    expect(MarketplaceUser.count).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'x@y.com' },
      include: [
        expect.objectContaining({
          model: Role,
          as: 'roles',
          where: { id: 7 },
          through: { attributes: [] },
          required: true,
        }),
      ],
      transaction: tx,
    }));
  });

  it('existsByEmailAndRoleId: false when count === 0 (managed tx path)', async () => {
    (MarketplaceUser.count as any).mockResolvedValue(0);

    const ok = await dao.existsByEmailAndRoleId('z@y.com', 9);
    expect(ok).toBe(false);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    const callArg = (MarketplaceUser.count as jest.Mock).mock.calls[0][0];
    expect(callArg.include?.[0]).toEqual(expect.objectContaining({
      model: Role,
      as: 'roles',
      where: { id: 9 },
      required: true,
      through: { attributes: [] },
    }));
    expect(callArg.transaction).toEqual(expect.any(Object));
  });

  // ---------- existsByEmailAndRoleCode ----------
  it('existsByEmailAndRoleCode: true when count > 0, and include uses role code', async () => {
    (MarketplaceUser.count as any).mockResolvedValue(1);

    const ok = await dao.existsByEmailAndRoleCode('m@n.com', 'ADMIN', { transaction: tx });
    expect(ok).toBe(true);

    const arg = (MarketplaceUser.count as jest.Mock).mock.calls[0][0];
    expect(arg.where).toEqual({ email: 'm@n.com' });
    expect(arg.include?.[0]).toEqual(expect.objectContaining({
      model: Role,
      as: 'roles',
      where: { code: 'ADMIN' },
      through: { attributes: [] },
      required: true,
    }));
    expect(arg.transaction).toBe(tx);
  });

  it('existsByEmailAndRoleCode: false when count === 0 (managed tx path)', async () => {
    (MarketplaceUser.count as any).mockResolvedValue(0);

    const ok = await dao.existsByEmailAndRoleCode('o@p.com', 'USER');
    expect(ok).toBe(false);

    expect(sequelize.transaction).toHaveBeenCalledTimes(1);
    const arg = (MarketplaceUser.count as jest.Mock).mock.calls[0][0];
    expect(arg.include?.[0].where).toEqual({ code: 'USER' });
    expect(arg.transaction).toEqual(expect.any(Object));
  });
});
