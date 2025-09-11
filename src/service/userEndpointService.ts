// eslint-disable-next-line @typescript-eslint/no-var-requires

import RoleCheckRequestDto from "src/web/dtos/RoleCheckRequestDto"
import RoleCheckResponseDto from "src/web/dtos/RoleCheckResponseDto"

interface UserEndpointServiceI {
    isAuthorizedAdjudicator: (request:  RoleCheckRequestDto) => RoleCheckResponseDto;
}

const isAuthorizedAdjudicator = (request:  RoleCheckRequestDto): RoleCheckResponseDto => {
    void request;
    // TODO: determine hasRole from DB
    return new RoleCheckResponseDto({hasRole: true});

}

const userEndpointService: UserEndpointServiceI = {
    isAuthorizedAdjudicator: isAuthorizedAdjudicator,
};

export default userEndpointService;
