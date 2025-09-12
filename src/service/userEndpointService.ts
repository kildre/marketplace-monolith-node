import RoleCheckRequestDto from 'src/web/dtos/RoleCheckRequestDto';
import RoleCheckResponseDto from 'src/web/dtos/RoleCheckResponseDto'; 
import { RoleEnum } from 'src/domain/enumeration/RoleEnum';
import { MarketplaceUserDAO } from 'src/rdbms/dao/MarketplaceUserDAO';

interface UserEndpointServiceI {
  isAuthorizedAdjudicator(request: RoleCheckRequestDto): Promise<RoleCheckResponseDto>;
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

const userEndpointService: UserEndpointServiceI = { isAuthorizedAdjudicator };
export default userEndpointService;