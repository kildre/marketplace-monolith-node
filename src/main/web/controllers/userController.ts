import { Request, Response, NextFunction } from "express";
import EmailCheckRequestDto from "../dtos/RoleCheckRequestDto";
import endpointService from "../../service/userEndpointService";
import log from "../../service/loggingService";


interface UserControllerI {
    isAuthorizedAdjudicator: (req: Request, res: Response, next: NextFunction) => void;
}

const isAuthorizedAdjudicator = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await endpointService.isAuthorizedAdjudicator(new EmailCheckRequestDto(req.body), req);
        res.status(200).json(result);
    } catch (e: any) {
        next(e);
    }
};

const userController: UserControllerI = {
    isAuthorizedAdjudicator: isAuthorizedAdjudicator,
};

export default userController;
