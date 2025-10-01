jest.mock('../../../../main/rdbms/entities/Role', () => {
  class Role {
    static create = jest.fn();
    static findByPk = jest.fn();
    static findAll = jest.fn();
  }
  return { Role };
});

import { Role } from '../../../../main/rdbms/entities/Role';
import { RoleDAO } from '../../../../main/rdbms/dao/RoleDAO';

describe('RoleDAO', () => {
  const dao = new RoleDAO();

  beforeEach(() => {
    (Role.create as any).mockReset?.();
    (Role.findByPk as any).mockReset?.();
    (Role.findAll as any).mockReset?.();
  });

  test('create', async () => {
    (Role.create as any).mockResolvedValue({ id: 1, name: 'ADMIN' });
    const r = await dao.create({ name: 'ADMIN' } as any);
    expect(r).toEqual({ id: 1, name: 'ADMIN' });
  });

  test('findAll', async () => {
    (Role.findAll as any).mockResolvedValue([{ id: 1 }]);
    const list = await dao.findAll();
    expect(list).toHaveLength(1);
  });
});
