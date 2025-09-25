// src/web/controllers/requestController.ts
import { Request, Response } from "express";
import SubmitRequestRequestDto from "../dtos/SubmitRequestRequestDto";
import SubmitRequestResponseDto from "../dtos/SubmitRequestResponseDto";
import ViewRequestsRequestDto from "../dtos/ViewRequestsRequestDto";
import ViewRequestsResponseDto from "../dtos/ViewRequestsResponseDto";

import { RequestEndpointService } from "../../service/requestEndpointService";

import { UnauthorizedRequestorException } from "../../service/errors/UnauthorizedRequestorException";
import { UnauthorizedAdjudicatorException } from "../../service/errors/UnauthorizedAdjudicatorException";

// use the stub by default; swap in your real implementation via DI if desired
import userEndpointService from "../../service/userEndpointService";

const service: RequestEndpointService = new RequestEndpointService();

async function submit(req: Request, res: Response<SubmitRequestResponseDto>) {
  try {
    const payload = req.body as SubmitRequestRequestDto;
    const response = await service.submit(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedRequestorException) {
      // Return a fallback DTO with an empty requestNumber
      return res
        .status(403)
        .json(new SubmitRequestResponseDto({ requestNumber: "" }));
    }
    return res
      .status(500)
      .json(new SubmitRequestResponseDto({ requestNumber: "" }));
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

export default {
  submit,
  viewPendingRequests,
  viewAllRequests,
  viewRequestsForRequestor,
};
