import { Transaction, FindOptions } from 'sequelize';
import { BaseDAO } from './BaseDAO';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { Role } from '../entities/Role';

export class MarketplaceUserDAO extends BaseDAO<MarketplaceUser> {
  constructor() {
    super(MarketplaceUser);
  }

  async findByEmail(email: string, options?: FindOptions): Promise<MarketplaceUser | null> {
    return MarketplaceUser.findOne({ where: { email }, ...options });
  }

  async getWithRoles(userId: number, options?: FindOptions): Promise<MarketplaceUser | null> {
    return MarketplaceUser.findByPk(userId, {
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
      ...options,
    });
  }

  async addRoles(userId: number, roleIds: number[], tx?: Transaction): Promise<void> {
    const user = await MarketplaceUser.findByPk(userId, { transaction: tx });
    if (!user) throw new Error('User not found');
    const roles = await Role.findAll({ where: { id: roleIds }, transaction: tx });
    // @ts-ignore – BelongsToMany mixin
    await user.$add('roles', roles, { transaction: tx });
  }

  async removeRole(userId: number, roleId: number, tx?: Transaction): Promise<void> {
    const user = await MarketplaceUser.findByPk(userId, { transaction: tx });
    if (!user) throw new Error('User not found');
    const role = await Role.findByPk(roleId, { transaction: tx });
    if (!role) return;
    // @ts-ignore
    await user.$remove('roles', role, { transaction: tx });
  }
}
