// src/web/controllers/requestController.ts
import { Request, Response } from "express";
import SubmitRequestRequestDto from "../dtos/SubmitRequestRequestDto";
import SubmitRequestResponseDto from "../dtos/SubmitRequestResponseDto";
import ViewRequestsRequestDto from "../dtos/ViewRequestsRequestDto";
import ViewRequestsResponseDto from "../dtos/ViewRequestsResponseDto";
import UseCaseRequestDto from "../dtos/UseCaseRequestDto";
import ViewRequestByRequestNumDto from "../dtos/ViewRequestByRequestNumDto";

import { RequestEndpointService } from "../../service/requestEndpointService";

import { UnauthorizedRequestorException } from "../../service/errors/UnauthorizedRequestorException";
import { UnauthorizedAdjudicatorException } from "../../service/errors/UnauthorizedAdjudicatorException";

// use the stub by default; swap in your real implementation via DI if desired
import userEndpointService from "../../service/userEndpointService";
import { ValidationError } from "class-validator";
import { UniqueConstraintError, ForeignKeyConstraintError } from "sequelize";
import { UseCaseRequestNotFoundException } from "../../service/errors/UseCaseRequestNotFoundException";

const service: RequestEndpointService = new RequestEndpointService();

export async function submit(
  req: Request,
  res: Response<SubmitRequestResponseDto>
) {
  try {
    const payload = req.body as SubmitRequestRequestDto;
    const response = await service.submit(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    // Domain errors
    if (e instanceof UnauthorizedRequestorException) {
      return res
        .status(404)
        .json(new SubmitRequestResponseDto({ requestNumber: ''}));
    }
    if (e instanceof UseCaseRequestNotFoundException) {
      return res
        .status(404)
        .json(new SubmitRequestResponseDto({ requestNumber: '' }));
    }

 // --- Wrapped generic Error messages thrown by the service ---
    if (typeof e?.message === 'string') {
      return res
        .status(400)
        .json(new SubmitRequestResponseDto({ requestNumber: '' }));
    }

    // Unknown error
    const generic =
      typeof e?.message === 'string' && e.message.trim()
        ? e.message
        : 'Internal Server Error';
    return res
      .status(500)
      .json(new SubmitRequestResponseDto({ requestNumber: '', errMsg: generic }));
  }
}
async function viewPendingRequests(
  req: Request,
  res: Response<ViewRequestsResponseDto>
) {
  try {
    const payload = req.body as ViewRequestsRequestDto;
    const response = await service.viewPendingRequests(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedAdjudicatorException) {
      // Return a fallback DTO with an empty requests array
      return res
        .status(403)
        .json(new ViewRequestsResponseDto({ requests: [] }));
    }
    return res.status(500).json(new ViewRequestsResponseDto({ requests: [] }));
  }
}

async function viewAllRequests(
  req: Request,
  res: Response<ViewRequestsResponseDto>
) {
  try {
    const payload = req.body as ViewRequestsRequestDto;
    const response = await service.viewAllRequests(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedAdjudicatorException) {
      return res
        .status(403)
        .json(new ViewRequestsResponseDto({ requests: [] }));
    }
    return res.status(500).json(new ViewRequestsResponseDto({ requests: [] }));
  }
}

async function viewRequestsForRequestor(
  req: Request,
  res: Response<ViewRequestsResponseDto>
) {
  try {
    const payload = req.body as ViewRequestsRequestDto;
    const response = await service.viewRequestsForRequestor(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedRequestorException) {
      return res
        .status(403)
        .json(new ViewRequestsResponseDto({ requests: [] }));
    }
    return res.status(500).json(new ViewRequestsResponseDto({ requests: [] }));
  }
}

async function viewRequestByRequestNumber(
  req: Request,
  res: Response<UseCaseRequestDto>
) {
  try {
    const payload = req.body as ViewRequestByRequestNumDto;
    const response = await service.viewRequestForRequestNumber(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedRequestorException) {
      return res
        .status(403)
        .json(new UseCaseRequestDto({}));
    }
    return res.status(500).json(new UseCaseRequestDto({}));
  }
}

export default {
  submit,
  viewPendingRequests,
  viewAllRequests,
  viewRequestsForRequestor,
  viewRequestByRequestNumber
};
