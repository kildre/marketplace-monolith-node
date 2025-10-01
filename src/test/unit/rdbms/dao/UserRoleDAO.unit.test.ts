// src/test/unit/rdbms/dao/user-role.dao.unit.test.ts

// ---- Mocks ----
jest.mock('../../../../main/rdbms/entities/UserRole', () => {
  class UserRole {
    static create = jest.fn();
    static destroy = jest.fn();
  }
  return { UserRole };
});

import { UserRole } from '../../../../main/rdbms/entities/UserRole';
import { UserRoleDAO } from '../../../../main/rdbms/dao/UserRoleDAO';

describe('UserRoleDAO', () => {
  const dao = new UserRoleDAO();
  const tx = Symbol('tx') as any; // sentinel "transaction" object

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- assign ----------
  it('assign creates a user-role with managed tx (passed)', async () => {
    (UserRole.create as any).mockResolvedValue({ user_id: 1, role_id: 2 });

    const ur = await dao.assign(1, 2, tx);

    expect(UserRole.create).toHaveBeenCalledWith(
      { user_id: 1, role_id: 2 },
      { transaction: tx }
    );
    expect(ur).toEqual({ user_id: 1, role_id: 2 });
  });

  it('assign creates a user-role without tx (transaction: undefined)', async () => {
    (UserRole.create as any).mockResolvedValue({ user_id: 3, role_id: 4 });

    const ur = await dao.assign(3, 4);

    expect(UserRole.create).toHaveBeenCalledWith(
      { user_id: 3, role_id: 4 },
      { transaction: undefined }
    );
    expect(ur).toEqual({ user_id: 3, role_id: 4 });
  });

  // ---------- remove ----------
  it('remove destroys the user-role with managed tx (passed)', async () => {
    (UserRole.destroy as any).mockResolvedValue(1);

    const n = await dao.remove(5, 6, tx);

    expect(UserRole.destroy).toHaveBeenCalledWith({
      where: { user_id: 5, role_id: 6 },
      transaction: tx,
    });
    expect(n).toBe(1);
  });

  it('remove destroys the user-role without tx (transaction: undefined)', async () => {
    (UserRole.destroy as any).mockResolvedValue(0);

    const n = await dao.remove(7, 8);

    expect(UserRole.destroy).toHaveBeenCalledWith({
      where: { user_id: 7, role_id: 8 },
      transaction: undefined,
    });
    expect(n).toBe(0);
  });
});
