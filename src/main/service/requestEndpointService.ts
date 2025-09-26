// src/services/requestEndpointServiceImpl.ts
import { Transaction, Sequelize } from "sequelize";
import { StatusEnum } from "../web/dtos/StatusEnum";
import { UseCaseRequestDAO } from "../rdbms/dao/UseCaseRequestDAO";
import { ProductDAO } from "../rdbms/dao/ProductDAO";
import userEndpointService from "./userEndpointService";
import { CartItem } from "../rdbms/entities/CartItem";
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
  async submit(
    request: SubmitRequestRequestDto
  ): Promise<SubmitRequestResponseDto> {
    // Check requestor authorization (this should be "requestor", not adjudicator)
    const payload = { userEmail: String(request.requestorEmail || "").trim() };
    const dto = new RoleCheckRequestDto(payload);
    const requestor = await this.userEndpointService.isAuthorizedAdjudicator(
      dto
    );
    const requestorUser = await this.userEndpointService.findByEmail(dto);
    // Create everything atomically
    const created = await this.sequelize.transaction(
      async (tx: Transaction) => {
        // create the base use-case request
        const useCaseReq = await this.useCaseRequestDAO.create(
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
            requestor_id: requestorUser.dataValues.id,
            status_id: StatusEnum.PENDING.id, // use enum object's id
          } as any,
          { transaction: tx }
        );
        console.log("Created UseCaseRequest:");
        // resolve product IDs for each cart item and insert cart rows
        for (const item of request.cartItems ?? []) {
          const product = await this.productDAO.findByName(item.name, {
            transaction: tx,
          });
          if (!product) {
            throw new ProductNotFoundException(item.name);
          }

          await CartItem.create(
            {
              request_id: (useCaseReq as any).dataValues.id,
              product_id: (product as any).dataValues.id,
              quantity: item.quantity,
            } as any,
            { transaction: tx }
          );

          console.log("Created cartitem:");
        }

        return useCaseReq;
      }
    );
    const respPayload = {
      requestNumber: String(request.requestNumber || "").trim(),
    };
    const response = new SubmitRequestResponseDto(respPayload);
    return response;
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
