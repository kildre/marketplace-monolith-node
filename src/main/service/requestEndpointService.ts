// src/services/requestEndpointServiceImpl.ts
import { Transaction, UniqueConstraintError, ForeignKeyConstraintError, ValidationError, Sequelize } from "sequelize";
import { StatusEnum } from "../web/dtos/StatusEnum";
import { UseCaseRequestDAO } from "../rdbms/dao/UseCaseRequestDAO";
import { ProductDAO } from "../rdbms/dao/ProductDAO";
import { CartItemDAO } from "../rdbms/dao/CartItemDAO";
import userEndpointService from "./userEndpointService";
import { UseCaseRequest } from "../rdbms/entities/UseCaseRequest";
import RoleCheckRequestDto from "../web/dtos/RoleCheckRequestDto";
import { Decision } from "../rdbms/entities/Decision";

// --- DTOs (same shapes you use in your controllers) ---
import CartItemDto from "../web/dtos/CartItemDto";
import DecisionDto from "../web/dtos/DecisionDto";
import SubmitRequestRequestDto from "../web/dtos/SubmitRequestRequestDto";
import UseCaseRequestDto from "../web/dtos/UseCaseRequestDto";
import ViewRequestsRequestDto from "../web/dtos/ViewRequestsRequestDto";
import ViewRequestsResponseDto from "../web/dtos/ViewRequestsResponseDto";
import SubmitRequestResponseDto from "../web/dtos/SubmitRequestResponseDto";

// --- Domain Error ---
export class ProductNotFoundException extends Error {
  constructor(name: string) {
    super(`Product not found: ${name}`);
    this.name = "ProductNotFoundException";
  }
}

export interface RequestEndpointServiceI {
  submit(req: SubmitRequestRequestDto): Promise<SubmitRequestResponseDto>;
  viewPendingRequests(
    req: ViewRequestsRequestDto
  ): Promise<ViewRequestsResponseDto>;
  viewAllRequests(
    req: ViewRequestsRequestDto
  ): Promise<ViewRequestsResponseDto>;
  viewRequestsForRequestor(
    req: ViewRequestsRequestDto
  ): Promise<ViewRequestsResponseDto>;
}

export class RequestEndpointService implements RequestEndpointServiceI {
  private userEndpointService = userEndpointService;
  private productDAO = new ProductDAO();
  private cartItemDAO = new CartItemDAO();
  private useCaseRequestDAO = new UseCaseRequestDAO();

  /** Use the Sequelize instance that the models are actually bound to. */
  private get sequelize(): Sequelize {
    const s = UseCaseRequest.sequelize;
    if (!s) {
      throw new Error(
        "UseCaseRequest model is not bound to a Sequelize instance. " +
        "Make sure initDb() ran and models were initialized."
      );
    }
    return s;
  }

  // ---------- submit ----------
  async submit(request: SubmitRequestRequestDto): Promise<SubmitRequestResponseDto> {
    // 1) Normalize & validate email
    const requestorEmail = String(request.requestorEmail ?? '')
      .trim()
      .toLowerCase();
    if (!requestorEmail) {
      throw new Error('requestorEmail is required');
    }

    const dto = new RoleCheckRequestDto({ userEmail: requestorEmail });
    const requestorUser = await this.userEndpointService.findByEmail(dto);
    if (!requestorUser) {
      throw new Error(`User with email ${requestorEmail} not found.`);
    }

    try {
      // 3) Transaction: create request + cart items
      const useCaseReq = await this.sequelize.transaction(async (tx: Transaction) => {
          const ucr = await this.useCaseRequestDAO.create(
            {
              requestNumber: request.requestNumber,
              requestedToolName: request.requestedToolName,
              description: request.description,
              designation: request.designation,
              agency: request.agency,
              organization: request.organization,
              otherOrganization: request.otherOrganization,
              pointOfContact: request.pointOfContact,
              email: request.email,
              phoneNumber: request.phoneNumber,
              estimatedRom: request.estimatedRom,
              requestorId: requestorUser.id,
              statusId: StatusEnum.PENDING.id,
            } as any,
            { transaction: tx }
          );
        console.log("Created UseCaseRequest:", ucr);
        // 3b) Resolve products & create CartItems
        for (const item of request.cartItems ?? []) {
          const product = await this.productDAO.findByName(item.name, { transaction: tx });
          if (!product) {
            throw new ProductNotFoundException(item.name);
          }
          console.log("Found Product:", product.dataValues.id, ucr.dataValues.id);
          await this.cartItemDAO.create(
            {
              requestId: ucr.dataValues.id,
              productId: product.dataValues.id,
              quantity: item.quantity,
            } as any,
            { transaction: tx }
          );
          console.log("Created CartItem for product:", item.name);
        }

        return ucr; // return from the transaction callback
      });

      // 4) Build response
      const response = new SubmitRequestResponseDto({
        requestNumber: String(request.requestNumber ?? '').trim(),
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

  // ---------- viewPendingRequests ----------
  async viewPendingRequests(
    req: ViewRequestsRequestDto
  ): Promise<ViewRequestsResponseDto> {
    const payload = { userEmail: String(req.userEmail || "").trim() };
    const dto = new RoleCheckRequestDto(payload);
    await this.userEndpointService.isAuthorizedAdjudicator(dto);

    const rows = await this.useCaseRequestDAO.findByStatusId(
      StatusEnum.PENDING.id
    );

    return { requests: rows.map((r) => this._toUseCaseRequestDto(r)) };
  }

  // ---------- viewAllRequests ----------
  async viewAllRequests(
    req: ViewRequestsRequestDto
  ): Promise<ViewRequestsResponseDto> {
    const payload = { userEmail: String(req.userEmail || "").trim() };
    const dto = new RoleCheckRequestDto(payload);
    await this.userEndpointService.isAuthorizedAdjudicator(dto);

    const rows = await this.useCaseRequestDAO.findAllRequests({
      include: this._minimalIncludes(),
      order: [["id", "DESC"]],
    } as any);

    return { requests: rows.map((r) => this._toUseCaseRequestDto(r)) };
  }

  // ---------- viewRequestsForRequestor ----------
  async viewRequestsForRequestor(
    req: ViewRequestsRequestDto
  ): Promise<ViewRequestsResponseDto> {
    const payload = { userEmail: String(req.userEmail || "").trim() };
    const dto = new RoleCheckRequestDto(payload);
    await this.userEndpointService.isAuthorizedAdjudicator(dto);
    const requestorUser = await this.userEndpointService.findByEmail(dto);

    const rows = await this.useCaseRequestDAO.findByRequestorId(
      requestorUser.dataValues.id,
      {
        include: this._minimalIncludes(),
        order: [["id", "DESC"]],
      } as any
    );

    return { requests: rows.map((r) => this._toUseCaseRequestDto(r)) };
  }

  // ---------- helpers ----------
  /** Eager includes built from the **model-bound** sequelize instance. */
  private _minimalIncludes() {
    const { MarketplaceUser, Status, Decision, CartItem, Product } = this
      .sequelize.models as any;

    return [
      { model: MarketplaceUser, as: "requestor" },
      { model: Status, as: "status" },
      {
        model: Decision,
        as: "decision",
        required: false,
        include: [{ model: Status, as: "status" }],
      },
      {
        model: CartItem,
        as: "cart_items",
        include: [{ model: Product, as: "product" }],
      },
    ];
  }

  private _toUseCaseRequestDto(r: UseCaseRequest): UseCaseRequestDto {
    const anyR = r.dataValues as any;
    const cartItems: CartItemDto[] = (anyR.cart_items ?? []).map((ci: any) => ({
      name: ci.product?.name ?? "UNKNOWN",
      quantity: ci.quantity,
    }));

    return {
      requestNumber: anyR.request_number,
      statusId: anyR.status_id ?? anyR.status?.id,
      requestorEmail: anyR.requestor?.email,
      designation: anyR.designation,
      agency: anyR.agency,
      organization: anyR.organization,
      otherOrganization: anyR.other_organization,
      pointOfContact: anyR.point_of_contact,
      email: anyR.email,
      phoneNumber: anyR.phone_number,
      requestedToolName: anyR.requested_tool_name,
      description: anyR.description,
      createdAt: anyR.createdAt,
      updatedAt: anyR.updatedAt ?? anyR.updateAt,
      decision: this._toDecisionDto(anyR.decision),
      cartItems,
    };
  }

  private _toDecisionDto(d?: Decision | null): DecisionDto | undefined {
    if (!d) return undefined;
    const anyD = d as any;
    return {
      decisionNumber: anyD.decision_number ?? anyD.decisionNumber,
      adjudicatorEmail: anyD.adjudicator?.email,
      statusId: anyD.status_id ?? anyD.status?.id,
      createdAt: anyD.createdAt,
      updatedAt: anyD.updatedAt ?? anyD.updateAt,
      comments: anyD.comments,
    };
  }
}

export default new RequestEndpointService();
