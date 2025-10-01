import RoleCheckRequestDto from '../web/dtos/RoleCheckRequestDto';
import RoleCheckResponseDto from '../web/dtos/RoleCheckResponseDto'; 
import { RoleEnum } from '../domain/enumeration/RoleEnum';
import { MarketplaceUserDAO } from '../rdbms/dao/MarketplaceUserDAO';
import { MarketplaceUser } from '../rdbms/entities/MarketplaceUser';

interface UserEndpointServiceI {
  isAuthorizedAdjudicator(request: RoleCheckRequestDto): Promise<RoleCheckResponseDto>;
  isAuthorizedRequestor(request: RoleCheckRequestDto): Promise<RoleCheckResponseDto>;
  findByEmail(request: RoleCheckRequestDto): Promise<MarketplaceUser>;
}

const userDao = new MarketplaceUserDAO();

const isAuthorizedAdjudicator = async (
  request: RoleCheckRequestDto
): Promise<RoleCheckResponseDto> => {
  const hasRole = await userDao.existsByEmailAndRoleId(
    request.userEmail,
    RoleEnum.ADJUDICATOR.id
  );
  return new RoleCheckResponseDto({ hasRole });
};

const isAuthorizedRequestor = async (
  request: RoleCheckRequestDto
): Promise<RoleCheckResponseDto> => {
  const hasRole = await userDao.existsByEmailAndRoleId(
    request.userEmail,
    RoleEnum.REQUESTOR.id
  );
  return new RoleCheckResponseDto({ hasRole });
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
  findByEmail
};
export default userEndpointService;