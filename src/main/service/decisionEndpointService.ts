// src/decisions/decision-endpoint.service.ts
import { Transaction, UniqueConstraintError, ForeignKeyConstraintError, ValidationError, Sequelize } from "sequelize";
import SubmitDecisionRequestDto from '../web/dtos/SubmitDecisionRequestDto';
import SubmitDecisionResponseDto from '../web/dtos/SubmitDecisionResponseDto';
import RoleCheckRequestDto from "../web/dtos/RoleCheckRequestDto";
import { UseCaseRequestNotFoundException } from './errors/UseCaseRequestNotFoundException';
import { UnauthorizedAdjudicatorException } from './errors/UnauthorizedAdjudicatorException';
import { DecisionDAO } from "../rdbms/dao/DecisionDAO";
import { Decision } from "../rdbms/entities/Decision";

// Replace with your actual DAOs/services

import { UseCaseRequestDAO } from '../rdbms/dao/UseCaseRequestDAO';
import userEndpointService from './userEndpointService';
import { StatusEnum, fromId, fromCode } from '../web/dtos/StatusEnum';

export interface DecisionEndpointServiceI {
  submit(req: SubmitDecisionRequestDto): Promise<SubmitDecisionResponseDto>;
}

export class DecisionEndpointService implements DecisionEndpointServiceI {
  private userEndpointService = userEndpointService;
  private decisionDAO = new DecisionDAO();
  private usecaseDao = new UseCaseRequestDAO();
  private StatusEnum = StatusEnum;

  /** Use the Sequelize instance that the models are actually bound to. */
  private get sequelize(): Sequelize {
    const s = Decision.sequelize;
    if (!s) {
      throw new Error(
        "UseCaseRequest model is not bound to a Sequelize instance. " +
        "Make sure initDb() ran and models were initialized."
      );
    }
    return s;
  }

  async submit(request: SubmitDecisionRequestDto): Promise<SubmitDecisionResponseDto> {
    // 1) Normalize & validate email
    const adjudicatorEmail = String(request.adjudicatorEmail ?? '')
      .trim()
      .toLowerCase();
    if (!adjudicatorEmail) {
      throw new Error('adjudicatorEmail is required');
    }

    const dto = new RoleCheckRequestDto({ userEmail: adjudicatorEmail });
    const roleCheckResponseDto = await this.userEndpointService.isAuthorizedAdjudicator(dto);
    if (!roleCheckResponseDto.hasRole) {
      throw new UnauthorizedAdjudicatorException(adjudicatorEmail);
    }

    const adjudicatorUser = await this.userEndpointService.findByEmail(dto);
    if (!adjudicatorUser) {
      throw new Error(`User with email ${adjudicatorEmail} not found.`);
    }

    if (!request.requestNumber) {
      throw new Error('requestNumber is required');
    }

    //Check statusId is valid
    const status = fromId(request.statusId ?? -1);
    if (!status) {
      throw new Error('statusId is required and must be valid');
    }

    const useCaseRequest = await this.usecaseDao.findByRequestNumber(request.requestNumber);
    if(!useCaseRequest) {
      throw new UseCaseRequestNotFoundException(String(request.requestNumber ?? ''));
    }

    try {
      const decisionReq = await this.sequelize.transaction(async (tx: Transaction) => {
        const decision = await this.decisionDAO.create(
          {
            decisionNumber: request.decisionNumber ?? '',
            ticketType: request.ticketType ?? null,
            asset: request.asset ?? null,
            quantity: request.quantity ?? null,
            estimatedPrice: request.estimatedPrice ?? null,
            comments: request.comments ?? '',
            requestId: useCaseRequest.id,
            adjudicatorId: adjudicatorUser.id,
            statusId: status.id,
          },
          { transaction: tx }
        );
      });

      // 4) Build response
      const response = new SubmitDecisionResponseDto({
        decisionNumber: String(request.decisionNumber ?? '').trim(),
        errMsg: '',
      });
      return response;
    } catch (err: any) {
      // 5) Error mapping
      if (err instanceof UniqueConstraintError) {
        throw new Error(
          `Duplicate value: ${err.errors?.[0]?.message ?? 'unique constraint violated'}`
        );
      }
      if (err instanceof ForeignKeyConstraintError) {
        const fields = Array.isArray(err.fields) ? err.fields.join(', ') : String(err.fields ?? '');
        throw new Error(`Invalid reference on ${err.table}${fields ? ` (${fields})` : ''}`);
      }
      if (err instanceof ValidationError) {
        throw new Error(`Validation failed: ${err.errors.map(e => e.message).join('; ')}`);
      }
      throw err; // let global handler/controller convert to HTTP 500, etc.
    }
  }
}
