// src/dao/UseCaseRequestDAO.ts
import { FindOptions, Includeable, Transaction, Sequelize } from "sequelize";
import { UseCaseRequest } from "../entities/UseCaseRequest";
import { IdDao } from "./IdDao";

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
      "where" | "include" | "limit" | "offset" | "transaction"
    >;
  };

export class UseCaseRequestDAO extends IdDao<UseCaseRequest> {
  constructor() {
    super(UseCaseRequest);
  }

  /** Use the same Sequelize instance the model is bound to */
  protected get sequelize(): Sequelize {
    const s = this.model.sequelize;
    if (!s) {
      throw new Error(
        `Model ${this.model.name} is not bound to a Sequelize instance. ` +
          "Did you call initModel(...) and initDb() before using the DAO?"
      );
    }
    return s;
  }

  /** Build safe includes with the correct aliases */
  private buildIncludes(
    flags: IncludeFlags,
    extra?: Includeable[]
  ): Includeable[] | undefined {
    const { MarketplaceUser, Status, Decision, CartItem, Product } = this
      .sequelize.models as any;

    const include: Includeable[] = [];

    if (flags.includeRequestor) {
      include.push({ model: MarketplaceUser, as: "requestor" });
    }
    if (flags.includeStatus) {
      include.push({ model: Status, as: "status" });
    }
    if (flags.includeDecisions) {
      include.push({
        model: Decision,
        as: "decisions",
        required: false,
        include: [{ model: Status, as: "status" }],
      });
    }
    if (flags.includeCartItems) {
      include.push({
        model: CartItem,
        as: "cartItems",
        include: [{ model: Product, as: "product" }],
      });
    }

    if (extra?.length) include.push(...extra);

    return include.length ? include : undefined;
  }

  async findAllRequests(
    options: CommonOpts & PageOpts = {}
  ): Promise<UseCaseRequest[]> {
    const include = this.buildIncludes(options, options.extraInclude);

    // Enforce maximum limit to prevent resource exhaustion
    const MAX_LIMIT = 1000;
    const safeLimit = options.limit ? Math.min(options.limit, MAX_LIMIT) : 50;

    return this.model.findAll({
      include,
      limit: safeLimit,
      offset: options.offset,
      transaction: options.transaction,
      order: [["id", "DESC"]],
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
    const include = this.buildIncludes(options, options.extraInclude);

    return this.model.findAll({
      where: { status_id: statusId } as any,
      include,
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
      order: [["id", "DESC"]],
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
    const include = this.buildIncludes(options, options.extraInclude);

    return this.model.findAll({
      where: { requestor_id: requestorId } as any,
      include,
      limit: options.limit,
      offset: options.offset,
      transaction: options.transaction,
      order: [["id", "DESC"]],
      ...(options.findOptions ?? {}),
    });
  }

  /**
   * SELECT * FROM use_case_request WHERE request_number = :requestNumber LIMIT 1
   */
  async findByRequestNumber(
    requestNumber: string,
    options: CommonOpts & { throwIfMissing?: boolean } = {}
  ) {
    const include = this.fullIncludes(); // ← mutable array
    return this.model.findOne({
      where: { requestNumber },
      include,
      transaction: options.transaction,
      raw: false,
      ...(options.findOptions ?? {}),
    });
  }

  private fullIncludes(): Includeable[] {
    return [
      { association: "requestor" },
      { association: "status" },
      {
        association: "cartItems",
        required: false,
        include: [{ association: "product" }],
      },
      {
        association: "decisions",
        required: false,
        include: [{ association: "status" }, { association: "adjudicator" }],
      },
    ];
  }
}
