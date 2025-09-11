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

 async existsByEmailAndRoleId(
    email: string,
    roleId: number,
    tx?: Transaction
  ): Promise<boolean> {
    const count = await MarketplaceUser.count({
      where: { email },
      include: [
        {
          model: Role,
          as: 'roles',
          where: { id: roleId },
          through: { attributes: [] },
          required: true,
        },
      ],
      transaction: tx,
    });
    return count > 0;
  }

  // If you prefer a role code/slug instead of numeric id:
  async existsByEmailAndRoleCode(
    email: string,
    roleCode: string,
    tx?: Transaction
  ): Promise<boolean> {
    const count = await MarketplaceUser.count({
      where: { email },
      include: [
        {
          model: Role,
          as: 'roles',
          where: { code: roleCode },
          through: { attributes: [] },
          required: true,
        },
      ],
      transaction: tx,
    });
    return count > 0;
  }
}  

