import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import RoleCheckRequestDto from "../dtos/RoleCheckRequestDto";
import endpointService from "../../service/userEndpointService";
import log from "src/service/loggingService";


interface UserControllerI {
    isAuthorizedAdjudicator: (req: Request, res: Response, next: NextFunction) => void;
}

const isAuthorizedAdjudicator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        log.info('Checking if user is an authorized adjudicator ...');
        const result = await endpointService.isAuthorizedAdjudicator(new RoleCheckRequestDto(req.body)); // <-- await
        res.status(200).json(result);
    } catch (e: any) {
        next(e);
    }
};

const userController: UserControllerI = {
    isAuthorizedAdjudicator: isAuthorizedAdjudicator,
};

export default userController;
