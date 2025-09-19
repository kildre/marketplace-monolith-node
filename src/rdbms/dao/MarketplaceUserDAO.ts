// src/rdbms/dao/MarketplaceUserDAO.ts
import { Transaction, FindOptions } from 'sequelize';
import { sequelize } from '../../config/sequelizeCLIConfig.cjs';
import { BaseDAO } from './BaseDAO';
import { MarketplaceUser } from '../entities/MarketplaceUser';
import { Role } from '../entities/Role';

type WithTx = { transaction?: Transaction };

export class MarketplaceUserDAO extends BaseDAO<MarketplaceUser> {
  constructor() {
    super(MarketplaceUser);
  }

  // ---------- helpers ----------
  private async withTx<T>(
    tx: Transaction | undefined,
    fn: (t: Transaction) => Promise<T>
  ): Promise<T> {
    if (tx) return fn(tx);
    return sequelize.transaction(fn);
  }

  // ---------- reads ----------
  async findByEmail(
    email: string,
    options?: FindOptions & WithTx
  ): Promise<MarketplaceUser | null> {
    const { transaction, ...rest } = options ?? {};
    return MarketplaceUser.findOne({ where: { email }, transaction, ...rest });
  }

  async getWithRoles(
    userId: number,
    options?: FindOptions & WithTx
  ): Promise<MarketplaceUser | null> {
    const { transaction, ...rest } = options ?? {};
    return MarketplaceUser.findByPk(userId, {
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
      transaction,
      ...rest,
    });
  }

  // ---------- writes (managed by default) ----------
  async addRoles(
    userId: number,
    roleIds: number[],
    opts: WithTx = {}
  ): Promise<void> {
    return this.withTx(opts.transaction, async (t) => {
      const user = await MarketplaceUser.findByPk(userId, { transaction: t });
      if (!user) throw new Error('User not found');

      const roles = await Role.findAll({ where: { id: roleIds }, transaction: t });
      // BelongsToMany mixin ($add)
      await (user as any).$add('roles', roles, { transaction: t });
    });
  }

  async removeRole(
    userId: number,
    roleId: number,
    opts: WithTx = {}
  ): Promise<void> {
    return this.withTx(opts.transaction, async (t) => {
      const user = await MarketplaceUser.findByPk(userId, { transaction: t });
      if (!user) throw new Error('User not found');

      const role = await Role.findByPk(roleId, { transaction: t });
      if (!role) return;

      await (user as any).$remove('roles', role, { transaction: t });
    });
  }

  // ---------- existence checks (managed by default) ----------
  async existsByEmailAndRoleId(
    email: string,
    roleId: number,
    opts: WithTx = {}
  ): Promise<boolean> {
    return this.withTx(opts.transaction, async (t) => {
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
        transaction: t,
      });
      return count > 0;
    });
  }

  async existsByEmailAndRoleCode(
    email: string,
    roleCode: string,
    opts: WithTx = {}
  ): Promise<boolean> {
    return this.withTx(opts.transaction, async (t) => {
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
        transaction: t,
      });
      return count > 0;
    });
  }
}
