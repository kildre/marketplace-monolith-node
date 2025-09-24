// src/web/controllers/requestController.ts
import { Request, Response } from 'express';
import {
  SubmitRequestRequestDto,
  SubmitRequestResponseDto,
  ViewRequestsRequestDto,
  ViewRequestsResponseDto,
} from '../dtos';

import { RequestEndpointService } from '../../service/requestEndpointService';

import { UnauthorizedRequestorException } from '../../service/errors/UnauthorizedRequestorException';
import { UnauthorizedAdjudicatorException } from '../../service/errors/UnauthorizedAdjudicatorException';


// use the stub by default; swap in your real implementation via DI if desired
import userEndpointService from '../../service/userEndpointService';

const service: RequestEndpointService = new RequestEndpointService();

async function submit(req: Request, res: Response<SubmitRequestResponseDto>) {
  try {
    const payload = req.body as SubmitRequestRequestDto;
    const response = await service.submit(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedRequestorException) {
      return res.status(403).json({ errMsg: e.message });
    }
    return res.status(500).json({ errMsg: e?.message || 'Internal Server Error' });
  }
}

async function viewPendingRequests(req: Request, res: Response<ViewRequestsResponseDto>) {
  try {
    const payload = req.body as ViewRequestsRequestDto;
    const response = await service.viewPendingRequests(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedAdjudicatorException) {
      return res.status(403).json({ errMsg: e.message });
    }
    return res.status(500).json({ errMsg: e?.message || 'Internal Server Error' });
  }
}

async function viewAllRequests(req: Request, res: Response<ViewRequestsResponseDto>) {
  try {
    const payload = req.body as ViewRequestsRequestDto;
    const response = await service.viewAllRequests(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedAdjudicatorException) {
      return res.status(403).json({ errMsg: e.message });
    }
    return res.status(500).json({ errMsg: e?.message || 'Internal Server Error' });
  }
}

async function viewRequestsForRequestor(req: Request, res: Response<ViewRequestsResponseDto>) {
  try {
    const payload = req.body as ViewRequestsRequestDto;
    const response = await service.viewRequestsForRequestor(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedRequestorException) {
      return res.status(403).json({ errMsg: e.message });
    }
    return res.status(500).json({ errMsg: e?.message || 'Internal Server Error' });
  }
}

export default {
  submit,
  viewPendingRequests,
  viewAllRequests,
  viewRequestsForRequestor,
};
