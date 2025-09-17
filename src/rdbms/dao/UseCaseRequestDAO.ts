// src/dao/UseCaseRequestDAO.ts
import { FindOptions, Transaction } from 'sequelize';
import { BaseDAO } from './BaseDAO';
import { UseCaseRequest } from '../entities/UseCaseRequest';

type WithTx = { transaction?: Transaction };

export class UseCaseRequestDAO extends BaseDAO<UseCaseRequest> {
  constructor() {
    super(UseCaseRequest);
  }

  /**
   * SELECT * FROM use_case_request WHERE status_id = :statusId
   */
  async findByStatusId(
    statusId: number,
    options: WithTx & {
      limit?: number;
      offset?: number;
      include?: FindOptions['include'];
      findOptions?: Omit<FindOptions, 'where' | 'include' | 'limit' | 'offset'>;
    } = {}
  ): Promise<UseCaseRequest[]> {
    return UseCaseRequest.findAll({
      where: { status_id: statusId },
      include: options.include,
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
      order: [['id', 'DESC']],
      ...(options.findOptions ?? {}),
    });
  }

  /**
   * SELECT * FROM use_case_request WHERE requestor_id = :requestorId
   */
  async findByRequestorId(
    requestorId: number,
    options: WithTx & {
      limit?: number;
      offset?: number;
      include?: FindOptions['include'];
      findOptions?: Omit<FindOptions, 'where' | 'include' | 'limit' | 'offset'>;
    } = {}
  ): Promise<UseCaseRequest[]> {
    return UseCaseRequest.findAll({
      where: { requestor_id: requestorId },
      include: options.include,
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
      order: [['id', 'DESC']],
      ...(options.findOptions ?? {}),
    });
  }

  /**
   * SELECT * FROM use_case_request WHERE request_number = :requestNumber LIMIT 1
   */
  async findByRequestNumber(
    requestNumber: string,
    options: WithTx & {
      include?: FindOptions['include'];
      findOptions?: Omit<FindOptions, 'where' | 'include'>;
    } = {}
  ): Promise<UseCaseRequest | null> {
    return UseCaseRequest.findOne({
      where: { request_number: requestNumber },
      include: options.include,
      transaction: options.transaction,
      ...(options.findOptions ?? {}),
    });
  }
}
