import {Request, Response, NextFunction } from "express";
import log from "../../service/loggingService";
import endpointService from "../../service/requestEndpointService";
import ViewRequestsRequestDto from "../dtos/ViewRequestsRequestDto";


interface RequestControllerI {
    viewAllRequests: (req: Request, res: Response, next: NextFunction) => void;
}

const viewAllRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
        log.info('Checking if user is an authorized adjudicator ...');
        const result = await endpointService.viewAllRequests(new ViewRequestsRequestDto(req.body)); // <-- await
        res.status(200).json(result);
    } catch (e: any) {
        next(e);
    }
};

const requestController: RequestControllerI = {
    viewAllRequests
}
export default requestController;