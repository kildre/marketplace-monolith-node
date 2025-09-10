jest.mock('../../../../rdbms/entities/UserRole', () => {
  class UserRole {
    static create = jest.fn();
    static destroy = jest.fn();
  }
  return { UserRole };
});

import { UserRole } from '../../../../rdbms/entities/UserRole';
import { UserRoleDAO } from '../../../../rdbms/dao/UserRoleDAO';

describe('UserRoleDAO', () => {
  const dao = new UserRoleDAO();

  beforeEach(() => {
    (UserRole.create as any).mockReset?.();
    (UserRole.destroy as any).mockReset?.();
  });

  test('assign', async () => {
    (UserRole.create as any).mockResolvedValue({ user_id: 1, role_id: 2 });
    const ur = await dao.assign(1, 2);
    expect(UserRole.create).toHaveBeenCalledWith({ user_id: 1, role_id: 2 }, { transaction: undefined });
    expect(ur).toEqual({ user_id: 1, role_id: 2 });
  });

  test('remove', async () => {
    (UserRole.destroy as any).mockResolvedValue(1);
    const n = await dao.remove(1, 2);
    expect(UserRole.destroy).toHaveBeenCalledWith({ where: { user_id: 1, role_id: 2 }, transaction: undefined });
    expect(n).toBe(1);
  });
});
