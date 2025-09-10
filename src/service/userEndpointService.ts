// eslint-disable-next-line @typescript-eslint/no-var-requires

import RoleCheckRequestDto from "src/web/dtos/RoleCheckRequestDto"
import RoleCheckResponseDto from "src/web/dtos/RoleCheckResponseDto"

export const isAuthorizedAdjudicator = (request:  RoleCheckRequestDto): RoleCheckResponseDto => {
    void request;
    // TODO: determine hasRole from DB
    return new RoleCheckResponseDto({hasRole: true});

}