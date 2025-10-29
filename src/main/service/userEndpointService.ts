import type { Request } from 'express';
import RoleCheckRequestDto from '../web/dtos/RoleCheckRequestDto';
import RoleCheckResponseDto from '../web/dtos/RoleCheckResponseDto';
import { MarketplaceUserDAO } from '../rdbms/dao/MarketplaceUserDAO';
import { MarketplaceUser } from '../rdbms/entities/MarketplaceUser';

// Use the auth utilities that read the token from the Express Request
import {
  getAuthToken, // (req: Request) => string | undefined
  isAuthorizedAdjudicator as tokenHasAdjudicatorRole, // (token: string) => boolean
  isAuthorizedRequestor as tokenHasRequestorRole,     // (token: string) => boolean
} from '../config/authConfig';

interface UserEndpointServiceI {
  isAuthorizedAdjudicator(request: RoleCheckRequestDto, req: Request): Promise<RoleCheckResponseDto>;
  isAuthorizedRequestor(request: RoleCheckRequestDto, req: Request): Promise<RoleCheckResponseDto>;
  findIdByEmail(request: RoleCheckRequestDto): Promise<number>;
  findByEmail(request: RoleCheckRequestDto): Promise<MarketplaceUser>;
}

const userDao = new MarketplaceUserDAO();

const isAuthorizedAdjudicator = async (
  request: RoleCheckRequestDto,
  req: Request
): Promise<RoleCheckResponseDto> => {
  // Normalize for logging or future use (not used for auth any more)
  const normalizedEmail = request.userEmail?.trim().toLowerCase() || '';

  try {
    const token = getAuthToken(req);
    if (!token) {
      return new RoleCheckResponseDto({ hasRole: false });
    }
    const hasRole = tokenHasAdjudicatorRole(token);
    return new RoleCheckResponseDto({ hasRole });
  } catch (e) {
    // If anything goes wrong, default to not authorized
    return new RoleCheckResponseDto({ hasRole: false });
  }
};

const isAuthorizedRequestor = async (
  request: RoleCheckRequestDto,
  req: Request
): Promise<RoleCheckResponseDto> => {
  const normalizedEmail = request.userEmail?.trim().toLowerCase() || '';

  try {
    const token = getAuthToken(req);
    if (!token) {
      return new RoleCheckResponseDto({ hasRole: false });
    }
    const hasRole = tokenHasRequestorRole(token);
    return new RoleCheckResponseDto({ hasRole });
  } catch (e) {
    return new RoleCheckResponseDto({ hasRole: false });
  }
};

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
  isAuthorizedAdjudicator,
  isAuthorizedRequestor,
  findIdByEmail,
  findByEmail,
};

export default userEndpointService;
