// src/decisions/decisions.router.ts
import { Request, Response, NextFunction } from 'express';

import SubmitDecisionRequestDto from "../dtos/SubmitDecisionRequestDto";
import SubmitDecisionResponseDto from "../dtos/SubmitDecisionResponseDto";

import { DecisionEndpointService } from '../../service/decisionEndpointService';

const service: DecisionEndpointService = new DecisionEndpointService();

async function submit(
  req: Request, 
  res: Response<SubmitDecisionResponseDto>,
  next: NextFunction
) {
  try {
    const payload = req.body as SubmitDecisionRequestDto;
    const response = await service.submit(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    next(e);
  }
}

export default {
  submit,
};


