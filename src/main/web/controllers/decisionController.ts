// src/decisions/decisions.router.ts
import { Request, Response } from 'express';

import SubmitDecisionRequestDto from "../dtos/SubmitDecisionRequestDto";
import SubmitDecisionResponseDto from "../dtos/SubmitDecisionResponseDto";

import { DecisionEndpointService } from '../../service/decisionEndpointService';

import { UseCaseRequestNotFoundException } from '../../service/errors/UseCaseRequestNotFoundException';
import { UnauthorizedAdjudicatorException } from '../../service/errors/UnauthorizedAdjudicatorException';

const service: DecisionEndpointService = new DecisionEndpointService();

async function submit(req: Request, res: Response<SubmitDecisionResponseDto>) {
  try {
    const payload = req.body as SubmitDecisionRequestDto;
    const response = await service.submit(payload);
    return res.status(200).json(response);
  } catch (e: any) {
    if (e instanceof UnauthorizedAdjudicatorException) {
      return res.status(403).json({ decisionNumber: '' });
    }
    return res.status(400).json({ decisionNumber: ''});
  }
}

export default {
  submit,
};


