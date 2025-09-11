import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import RoleCheckRequestDto from "../dtos/RoleCheckRequestDto";
import endpointService from "../../service/userEndpointService";
import log from "src/service/loggingService";


interface UserControllerI {
    isAuthorizedAdjudicator: (req: Request, res: Response, next: NextFunction) => void;
}

const isAuthorizedAdjudicator = (req: Request, res: Response, next: NextFunction) => {
    try {
        log.info('Checking if user is an authorized adjudicator ...');
        res.status(200).json(endpointService.isAuthorizedAdjudicator(new RoleCheckRequestDto(req.body)));
    } catch (e: any) {
        next(e);
    }
};

const userController: UserControllerI = {
    isAuthorizedAdjudicator: isAuthorizedAdjudicator,
};

export default userController;
