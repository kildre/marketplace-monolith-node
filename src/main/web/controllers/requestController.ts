// src/web/controllers/requestController.ts
import { Request, Response, NextFunction } from "express";
import SubmitRequestRequestDto from "../dtos/SubmitRequestRequestDto";
import SubmitRequestResponseDto from "../dtos/SubmitRequestResponseDto";
import ViewRequestsRequestDto from "../dtos/ViewRequestsRequestDto";
import ViewRequestsResponseDto from "../dtos/ViewRequestsResponseDto";
import UseCaseRequestDto from "../dtos/UseCaseRequestDto";
import ViewRequestByRequestNumDto from "../dtos/ViewRequestByRequestNumDto";

import { RequestEndpointService } from "../../service/requestEndpointService";

import { UnauthorizedRequestorException } from "../../domain/errors/UnauthorizedRequestorError";
import { UnauthorizedAdjudicatorException } from "../../domain/errors/UnauthorizedAdjudicatorError";

// use the stub by default; swap in your real implementation via DI if desired
import userEndpointService from "../../service/userEndpointService";
import { ValidationError } from "class-validator";
import { UniqueConstraintError, ForeignKeyConstraintError } from "sequelize";
import { UseCaseRequestNotFoundException } from "../../domain/errors/UseCaseRequestNotFoundError";

const service: RequestEndpointService = new RequestEndpointService();

export async function submit(
  req: Request,
  res: Response<SubmitRequestResponseDto>,
  next: NextFunction
) {
  try {
    const payload = req.body as SubmitRequestRequestDto;
    const response = await service.submit(payload);
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
    const payload = req.body as ViewRequestsRequestDto;
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
    const payload = req.body as ViewRequestsRequestDto;
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
    const payload = req.body as ViewRequestsRequestDto;
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
    const payload = req.body as ViewRequestByRequestNumDto;
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
