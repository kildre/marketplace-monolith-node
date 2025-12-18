import { NextFunction, Request, Response } from "express";
import NotificationRecipientDto from "../dtos/NotificationRecipientDto";
import endpointService from "../../service/notificationRecipientEndpointService";
import { CurrentUserNotFoundError } from "src/main/domain/errors/CurrentUserNotFoundError";


export interface NotificationRecipientControllerI {
    getVisible(req: Request, res: Response<NotificationRecipientDto[]>, next: NextFunction): void;
}


class NotificationRecipientController implements NotificationRecipientControllerI {
    async getVisible(
        req: Request,
        res: Response<NotificationRecipientDto[]>,
        next: NextFunction
    ) {
        try {
            if (!req.currentUser) {
                throw new CurrentUserNotFoundError();
            }
            const result = await endpointService.getVisible(req.currentUser);
            res.status(200).json(result);
        } catch (e: any) {
            next(e);
        }
    }
}

const notificationRecipientController: NotificationRecipientControllerI = new NotificationRecipientController();
export default notificationRecipientController;
