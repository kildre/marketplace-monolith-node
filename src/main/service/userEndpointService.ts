import type { Request } from 'express';
import RoleCheckRequestDto from '../web/dtos/RoleCheckRequestDto';
import RoleCheckResponseDto from '../web/dtos/RoleCheckResponseDto';
import marketplaceUserDao from '../rdbms/dao/marketplaceUserDao';
import { MarketplaceUser } from '../rdbms/entities/MarketplaceUser';

// Use the auth utilities that read the token from the Express Request
import {
  getAuthToken, // (req: Request) => string | undefined
  isAuthorizedAdjudicator as tokenHasAdjudicatorRole, // (token: string) => boolean
  isAuthorizedRequestor as tokenHasRequestorRole,     // (token: string) => boolean
} from '../config/authConfig';

export interface UserEndpointServiceI {
  findIdByEmail(request: RoleCheckRequestDto): Promise<number>;
  findByEmail(request: RoleCheckRequestDto): Promise<MarketplaceUser>;
}

const userDao = marketplaceUserDao;

const findIdByEmail = async (request: RoleCheckRequestDto): Promise<number> => {
  const email = request.userEmail?.trim().toLowerCase();
  if (!email) throw new Error('userEmail is required.');
  const u = await userDao.findByEmail(email);
  if (!u) throw new Error(`User with email ${email} not found.`);
  return Number(u.dataValues.id);
};

const findByEmail = async (request: RoleCheckRequestDto): Promise<MarketplaceUser> => {
  const email = request.userEmail?.trim().toLowerCase();
  if (!email) throw new Error('userEmail is required.');
  const user = await userDao.findByEmail(email);
  if (!user) throw new Error(`User with email ${email} not found.`);
  return user;
};

const userEndpointService: UserEndpointServiceI = {
  findIdByEmail,
  findByEmail,
};

export default userEndpointService;
