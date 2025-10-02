import { Transaction } from 'sequelize';
import { BaseDAO } from './BaseDAO';
import { UserRole } from '../entities/UserRole';

export class UserRoleDAO extends BaseDAO<UserRole> {
  constructor() {
    super(UserRole);
  }

  async assign(userId: number, roleId: number, tx?: Transaction): Promise<UserRole> {
    return UserRole.create({ userId, roleId } as any, { transaction: tx });
  }

  async remove(userId: number, roleId: number, tx?: Transaction): Promise<number> {
    return UserRole.destroy({ where: { userId, roleId }, transaction: tx });
  }
}
