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

  it('findByEmail without opts uses only where and no transaction', async () => {
    (MarketplaceUser.findOne as any).mockResolvedValue(null);

    await dao.findByEmail('Mixed@Case.com');

    expect(MarketplaceUser.findOne).toHaveBeenCalledTimes(1);
    const arg = (MarketplaceUser.findOne as any).mock.calls[0][0];

    const expectedWhere = sWhere(sFn('lower', sCol('email')), 'mixed@case.com');
    expect(arg.where).toEqual(expectedWhere);
    expect(arg.transaction).toBeUndefined();
  });
});
