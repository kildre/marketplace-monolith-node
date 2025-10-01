// src/dao/UseCaseRequestDAO.ts
import { FindOptions, Includeable, Transaction, Sequelize } from 'sequelize';
import { BaseDAO } from './BaseDAO';
import { UseCaseRequest } from '../entities/UseCaseRequest';

type WithTx = { transaction?: Transaction };

type IncludeFlags = {
  includeRequestor?: boolean;
  includeStatus?: boolean;
  includeDecisions?: boolean;
  includeCartItems?: boolean;
};

type PageOpts = { limit?: number; offset?: number };

type CommonOpts = WithTx &
  IncludeFlags & {
    /** Extra include entries if you really need them */
    extraInclude?: Includeable[];
    /** Anything else you want to pass (attributes, order, paranoid, etc.) */
    findOptions?: Omit<
      FindOptions,
      'where' | 'include' | 'limit' | 'offset' | 'transaction'
    >;
  };

export class UseCaseRequestDAO extends BaseDAO<UseCaseRequest> {
  constructor() {
    super(UseCaseRequest);
  }

  /** Use the same Sequelize instance the model is bound to */
  protected get sequelize(): Sequelize {
    const s = this.model.sequelize;
    if (!s) {
      throw new Error(
        `Model ${this.model.name} is not bound to a Sequelize instance. ` +
        'Did you call initModel(...) and initDb() before using the DAO?'
      );
    }
    return s;
  }

  /** Build safe includes with the correct aliases */
  private buildIncludes(flags: IncludeFlags, extra?: Includeable[]): Includeable[] | undefined {
    const { MarketplaceUser, Status, Decision, CartItem } = this.sequelize.models as any;

    const include: Includeable[] = [];

    if (flags.includeRequestor) {
      include.push({ model: MarketplaceUser, as: 'requestor' });
    }
    if (flags.includeStatus) {
      include.push({ model: Status, as: 'status' });
    }
    if (flags.includeDecisions) {
      include.push({ model: Decision, as: 'decisions' }); // <-- plural alias defined in your model
    }
    if (flags.includeCartItems) {
      include.push({ model: CartItem, as: 'cartItems' });
    }

    if (extra?.length) include.push(...extra);

    return include.length ? include : undefined;
  }

  async findAllRequests(
    options: CommonOpts & PageOpts = {}
  ): Promise<UseCaseRequest[]> {
    const include = this.buildIncludes(
      options,
      options.extraInclude
    );

    return this.model.findAll({
      include,
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
      order: [['id', 'DESC']],
      ...(options.findOptions ?? {}),
    });
  }

  /**
   * SELECT * FROM use_case_request WHERE status_id = :statusId
   */
  async findByStatusId(
    statusId: number,
    options: CommonOpts & PageOpts = {}
  ): Promise<UseCaseRequest[]> {
    const include = this.buildIncludes(
      options,
      options.extraInclude
    );

    return this.model.findAll({
      where: { status_id: statusId } as any,
      include,
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
    options: CommonOpts & PageOpts = {}
  ): Promise<UseCaseRequest[]> {
    const include = this.buildIncludes(
      options,
      options.extraInclude
    );

    return this.model.findAll({
      where: { requestor_id: requestorId } as any,
      include,
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
    options: CommonOpts & { throwIfMissing?: boolean } = {}
  ): Promise<UseCaseRequest | null> {
    const include = this.buildIncludes(options, options.extraInclude);
    const row = await this.model.findOne({
      where: { requestNumber },             // ✅ use attribute name; Sequelize maps to request_number
      include,
      transaction: options.transaction,
      raw: false,                           // ✅ ensure Model instance
      ...(options.findOptions ?? {}),
    });

    if (!row) {
      if (options.throwIfMissing) {
        throw new Error(`UseCaseRequest with requestNumber=${requestNumber} not found`);
      }
      return null;
    }
    // Runtime validation (defensive): make sure it's a Sequelize model instance of THIS model.
    // Note: instanceof can be brittle if multiple copies of the class exist; this version is safer.
    const looksLikeModel =
      typeof (row as any).get === 'function' &&
      (row as any).constructor === this.model;

    if (!looksLikeModel) {
      // Optionally log `row` here for diagnostics
      throw new Error('Invariant violation: expected a UseCaseRequest model instance');
    }

    return row as UseCaseRequest;
  }

}
