import { NextFunction, Request, Response } from "express";
import GetVisibleNotificationRecipientsRequestDto from "../dtos/GetVisibleNotificationRecipientsRequestDto";
import NotificationRecipientDto from "../dtos/NotificationRecipientDto";
import endpointService from "../../service/notificationRecipientEndpointService";


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
            const payload = new GetVisibleNotificationRecipientsRequestDto(req.body);
            const result = await endpointService.getVisible(payload);
            res.status(200).json(result);
        } catch (e: any) {
            next(e);
        }
    }
}

const notificationRecipientController: NotificationRecipientControllerI = new NotificationRecipientController();
export default notificationRecipientController;
