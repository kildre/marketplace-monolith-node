// src/decisions/decision-endpoint.service.ts
import { Transaction, UniqueConstraintError, ForeignKeyConstraintError, ValidationError, Sequelize } from "sequelize";
import SubmitDecisionRequestDto from '../web/dtos/SubmitDecisionRequestDto';
import SubmitDecisionResponseDto from '../web/dtos/SubmitDecisionResponseDto';
import EmailCheckRequestDto from "../web/dtos/RoleCheckRequestDto";
import { UseCaseRequestNotFoundError } from '../domain/errors/UseCaseRequestNotFoundError';
import decisionDao from "../rdbms/dao/decisionDao";
import { Decision } from "../rdbms/entities/Decision";
import { NotificationPriorityEnum } from "../domain/enumeration/NotificationPriorityEnum";

// Replace with your actual DAOs/services

import { UseCaseRequestDAO } from '../rdbms/dao/UseCaseRequestDAO';
// TODO: An endpoint service should not depend on another endpoint service. Common functionality should be extracted to a shared lower level service. Refactor needed.
import userEndpointService from './userEndpointService';
import { StatusEnum, fromId } from '../domain/enumeration/StatusEnum';
import { notificationService } from "./notificationService";
import MissingAssociationError from "../domain/errors/MissingAssociationError";

export interface DecisionEndpointServiceI {
  submit(req: SubmitDecisionRequestDto): Promise<SubmitDecisionResponseDto>;
}

export class DecisionEndpointService implements DecisionEndpointServiceI {
  private userEndpointService = userEndpointService;
  private usecaseDao = new UseCaseRequestDAO();
  private decisionDao = decisionDao;
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

    // TODO: We need to figure out how to do this check when the dto is constructed. At this point, there should be no question that it has an adjudicatorEmail.
    // 1) Normalize & validate email
    const adjudicatorEmail = String(request.adjudicatorEmail ?? '')
      .trim()
      .toLowerCase();
    if (!adjudicatorEmail) {
      throw new Error('adjudicatorEmail is required');
    }

    const dto = new EmailCheckRequestDto({ userEmail: adjudicatorEmail });

    const adjudicatorUser = await this.userEndpointService.findByEmail(dto);
    if (!adjudicatorUser) {
      throw new Error(`User with email ${adjudicatorEmail} not found.`);
    }

    //Check statusId is valid
    const status = fromId(request.statusId ?? -1);
    if (!status) {
      throw new Error('statusId is required and must be valid');
    }

    try {
      const decisionReq = await this.sequelize.transaction(async (tx: Transaction) => {

        // TODO: We need to figure out how to do this check when the dto is constructed. At this point, there should be no question that it has a request number.
        if (!request.requestNumber) {
          throw new Error('requestNumber is required');
        }

        const useCaseRequest = await this.usecaseDao.findByRequestNumber(request.requestNumber);
        if(!useCaseRequest) {
          throw new UseCaseRequestNotFoundError(String(request.requestNumber ?? ''));
        }

        if (!useCaseRequest.requestor) {
          throw new MissingAssociationError({
            associationName: 'requestor',
            entityClassName: 'UseCaseRequest',
          });
        }

        const decision = await this.decisionDao.create(
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

        

        if (status.id === this.StatusEnum.APPROVED.id) {
          await notificationService.send({
            recipientIds: [useCaseRequest.requestor.id],
            title: `Request ${useCaseRequest.dataValues.requestNumber} Approved`,
            message: `Your request ${useCaseRequest.dataValues.requestNumber} has been approved. We are now in the process of checking internal inventory for your items. You will receive a notification when the status of your request has been updated.`,
            priority: NotificationPriorityEnum.MEDIUM,
            tx,
          });
          await notificationService.send({
            recipientIds: [adjudicatorUser.id],
            title: `Request ${useCaseRequest.dataValues.requestNumber} Approved`,
            message: `You have approved request ${useCaseRequest.dataValues.requestNumber}. We are now in the process of checking internal inventory for your items. You will receive a notification when the status of this request has been updated.`,
            priority: NotificationPriorityEnum.MEDIUM,
            tx,
          });

        } else if (status.id === this.StatusEnum.DENIED.id) {
          await notificationService.send({
            recipientIds: [useCaseRequest.requestor.id],
            title: `Request ${useCaseRequest.dataValues.requestNumber} Denied`,
            message: `Your request ${useCaseRequest.dataValues.requestNumber} has been denied. You may check the request to view the reason it was denied if one was provided.`,
            priority: NotificationPriorityEnum.MEDIUM,
            tx,
          });
          await notificationService.send({
            recipientIds: [adjudicatorUser.id],
            title: `Request ${useCaseRequest.dataValues.requestNumber} Denied`,
            message: `You have denied request ${useCaseRequest.dataValues.requestNumber}. If you provided details as to the reasoning behind your decision, they will be made viewable to the requestor.`,
            priority: NotificationPriorityEnum.MEDIUM,
            tx,
          });
        }
      });

      // 4) Build response
      const response = new SubmitDecisionResponseDto({
        decisionNumber: String(request.decisionNumber ?? '').trim(),
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
