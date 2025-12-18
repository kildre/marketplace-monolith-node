// src/web/controllers/requestController.ts
import { Request, Response, NextFunction } from "express";
import SubmitRequestRequestDto from "../dtos/SubmitRequestRequestDto";
import SubmitRequestResponseDto from "../dtos/SubmitRequestResponseDto";
import ViewRequestsRequestDto from "../dtos/ViewRequestsRequestDto";
import ViewRequestsResponseDto from "../dtos/ViewRequestsResponseDto";
import UseCaseRequestDto from "../dtos/UseCaseRequestDto";
import ViewRequestByRequestNumDto from "../dtos/ViewRequestByRequestNumDto";
import service from "../../service/requestEndpointService";
import { CurrentUserNotFoundError } from "src/main/domain/errors/CurrentUserNotFoundError";

export async function submit(
  req: Request,
  res: Response<SubmitRequestResponseDto>,
  next: NextFunction
) {
  try {
    if (!req.currentUser) {
      throw new CurrentUserNotFoundError();
    }
    const payload = new SubmitRequestRequestDto(req.body);
    const response = await service.submit(payload, req.currentUser);
    return res.status(200).json(response);
  } catch (e: any) {
    next(e);
  }
}
async function viewPendingRequests(
  req: Request,
  res: Response<ViewRequestsResponseDto>,
  next: NextFunction
) {
  try {
    const payload = new ViewRequestsRequestDto(req.body);
    const response = await service.viewPendingRequests(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    next(e);
  }
}

async function viewAllRequests(
  req: Request,
  res: Response<ViewRequestsResponseDto>,
  next: NextFunction
) {
  try {
    const payload = new ViewRequestsRequestDto(req.body);
    const response = await service.viewAllRequests(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    next(e);
  }
}

async function viewRequestsForRequestor(
  req: Request,
  res: Response<ViewRequestsResponseDto>,
  next: NextFunction
) {
  try {
    const payload = new ViewRequestsRequestDto(req.body);
    const response = await service.viewRequestsForRequestor(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    next(e);
  }
}

async function viewRequestByRequestNumber(
  req: Request,
  res: Response<UseCaseRequestDto>,
  next: NextFunction
) {
  try {
    const payload = new ViewRequestByRequestNumDto(req.body);
    const response = await service.viewRequestForRequestNumber(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    next(e);
  }
}

export default {
  submit,
  viewPendingRequests,
  viewAllRequests,
  viewRequestsForRequestor,
  viewRequestByRequestNumber
};
