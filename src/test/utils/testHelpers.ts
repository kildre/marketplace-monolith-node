import { Sequelize } from 'sequelize';
import { RoleEnum } from '../../main/domain/enumeration/RoleEnum';

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export function serializeError(err: any) {
  if (!err) return err;
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  try {
    return JSON.parse(JSON.stringify(err));
  } catch (_e) {
    try {
      return String(err);
    } catch (_e2) {
      return { value: 'unserializable error' };
    }
  }
}

export async function seedRoles(Role: any) {
  try {
    await Role.bulkCreate([
      { id: RoleEnum.ADJUDICATOR.id, name: 'ADJUDICATOR' },
      { id: RoleEnum.REQUESTOR.id, name: 'REQUESTOR' },
    ], {
      ignoreDuplicates: true,
      validate: true,
    });
  } catch (error) {
    // fallback to individual creates
    try { await Role.create({ id: RoleEnum.ADJUDICATOR.id, name: 'ADJUDICATOR' }); } catch {}
    try { await Role.create({ id: RoleEnum.REQUESTOR.id, name: 'REQUESTOR' }); } catch {}
  }
}

export async function createTestUser(MarketplaceUser: any, Role: any, email: string, roleId: number) {
  const normalized = normalizeEmail(email);
  const user = await MarketplaceUser.create({ email: normalized });
  const role = await Role.findByPk(roleId);
  await user.addRole(role);
  return user;
}

export async function cleanTestData({ MarketplaceUser, UserRole }: { MarketplaceUser: any, UserRole: any }) {
  await UserRole.destroy({ where: {} });
  await MarketplaceUser.destroy({ where: {} });
}
