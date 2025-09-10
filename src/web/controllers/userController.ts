import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import RoleCheckRequestDto from "../dtos/RoleCheckRequestDto";
import endpointService from "../../service/userEndpointService";


interface UserControllerI {
    isAuthorizedAdjudicator: (req: Request, res: Response, next: NextFunction) => void;
}

const isAuthorizedAdjudicator = (req: Request, res: Response, next: NextFunction) => {
    try {
        const reqDto = plainToInstance(RoleCheckRequestDto, req.body as RoleCheckRequestDto);
        res.status(200).json(endpointService.isAuthorizedAdjudicator(reqDto));
    } catch (e: any) {
        next(e);
    }
};

const userController: UserControllerI = {
    isAuthorizedAdjudicator: isAuthorizedAdjudicator,
};

export default userController;
