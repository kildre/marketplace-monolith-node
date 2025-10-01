// src/services/requestEndpointServiceImpl.ts
import { ForeignKeyConstraintError, Sequelize, Transaction, UniqueConstraintError, ValidationError } from "sequelize";
import { CartItemDAO } from "../rdbms/dao/CartItemDAO";
import { ProductDAO } from "../rdbms/dao/ProductDAO";
import { UseCaseRequestDAO } from "../rdbms/dao/UseCaseRequestDAO";
import { Decision } from "../rdbms/entities/Decision";
import { UseCaseRequest } from "../rdbms/entities/UseCaseRequest";
import RoleCheckRequestDto from "../web/dtos/RoleCheckRequestDto";
import ViewRequestByRequestNumDto from "../web/dtos/ViewRequestByRequestNumDto";

import { StatusEnum } from "../web/dtos/StatusEnum";
import userEndpointService from "./userEndpointService";

// --- DTOs (same shapes you use in your controllers) ---
import CartItemDto from "../web/dtos/CartItemDto";
import DecisionDto from "../web/dtos/DecisionDto";
import SubmitRequestRequestDto from "../web/dtos/SubmitRequestRequestDto";
import SubmitRequestResponseDto from "../web/dtos/SubmitRequestResponseDto";
import UseCaseRequestDto from "../web/dtos/UseCaseRequestDto";
import ViewRequestsRequestDto from "../web/dtos/ViewRequestsRequestDto";
import ViewRequestsResponseDto from "../web/dtos/ViewRequestsResponseDto";
import { ProductNotFoundException } from './errors/ProductNotFoundException';
import { UnauthorizedAdjudicatorException } from './errors/UnauthorizedAdjudicatorException';
import { UseCaseRequestNotFoundException } from './errors/UseCaseRequestNotFoundException';

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
    //Normalize & validate email
    const requestorEmail = String(request.requestorEmail ?? '')
      .trim()
      .toLowerCase();
    if (!requestorEmail) {
      throw new Error('requestorEmail is required');
    }

    const dto = new RoleCheckRequestDto({ userEmail: requestorEmail });

    const roleCheckResponseDto = await this.userEndpointService.isAuthorizedAdjudicator(dto);
    if (!roleCheckResponseDto.hasRole) {
      throw new UnauthorizedAdjudicatorException(requestorEmail);
    }

    const requestorUser = await this.userEndpointService.findByEmail(dto);
    if (!requestorUser) {
      throw new Error(`User with email ${requestorEmail} not found.`);
    }

    try {
      //Transaction: create request + cart items
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
        // Resolve products & create CartItems
        for (const item of request.cartItems ?? []) {
          const product = await this.productDAO.findByName(item.name, { transaction: tx });
          if (!product) {
            throw new ProductNotFoundException(item.name);
          }
          await this.cartItemDAO.create(
            {
              requestId: ucr.dataValues.id,
              productId: product.dataValues.id,
              quantity: item.quantity,
            } as any,
            { transaction: tx }
          );
        }

        return ucr; // return from the transaction callback
      });

      //Build response
      const response = new SubmitRequestResponseDto({
        requestNumber: String(request.requestNumber ?? '').trim(),
      });
      return response;
    } catch (err: any) {
      //Error mapping
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
    const roleCheckResponseDto = await this.userEndpointService.isAuthorizedAdjudicator(dto);
    if (!roleCheckResponseDto.hasRole) {
      throw new UnauthorizedAdjudicatorException(payload.userEmail);
    }

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
    const roleCheckResponseDto = await this.userEndpointService.isAuthorizedAdjudicator(dto);
    console.log('roleCheckResponseDto.hasRole:', roleCheckResponseDto.hasRole);
    if (!roleCheckResponseDto.hasRole) {
      throw new UnauthorizedAdjudicatorException(payload.userEmail);
    }
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
    const roleCheckResponseDto = await this.userEndpointService.isAuthorizedAdjudicator(dto);
    if (!roleCheckResponseDto.hasRole) {
      throw new UnauthorizedAdjudicatorException(payload.userEmail);
    }
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

  // ---------- viewRequestsForRequestor ----------
  async viewRequestForRequestNumber(
    req: ViewRequestByRequestNumDto
  ): Promise<UseCaseRequestDto> {
    const payload = { userEmail: String(req.userEmail || "").trim() };
    const dto = new RoleCheckRequestDto(payload);
    const roleCheckResponseDto = await this.userEndpointService.isAuthorizedAdjudicator(dto);
    if (!roleCheckResponseDto.hasRole) {
      throw new UnauthorizedAdjudicatorException(payload.userEmail);
    }

    const row = await this.useCaseRequestDAO.findByRequestNumber(
      req.requestNumber,
      {
        include: this._minimalIncludes(),
        order: [["id", "DESC"]],
      } as any
    );

    if (!row) {
      throw new UseCaseRequestNotFoundException(String(req.requestNumber ?? '')); 
    }
    return this._toUseCaseRequestDto(row);
  }

  // ---------- helpers ----------
  /** Eager includes built from the **model-bound** sequelize instance. */
  private _minimalIncludes() {
    // You can reference by association name (recommended):
    return [
      { association: "requestor" },
      { association: "status" },
      {
        association: "decisions",       
        required: false,
        include: [{ association: "status" }],
      },
      {
        association: "cartItems",       
        required: false,                
        include: [{ association: "product" }],
      },
    ];
  }

  private _toUseCaseRequestDto(row: UseCaseRequest | any): UseCaseRequestDto {
    // If it's a Sequelize model, get a plain clone (camelCase keys)
    const r: any =
      typeof row?.get === 'function' ? row.get({ plain: true, clone: true }) : row;

    // Helper to pick the first defined value (handles camelCase or snake_case)
    const pick = <T>(...vals: (T | undefined)[]) =>
      vals.find(v => v !== undefined);

    // cart items (expects include: { model: CartItem, as: 'cartItems', include: [{ model: Product, as: 'product' }] })
    const cartItems: CartItemDto[] = (r.cartItems ?? r.cart_items ?? []).map((ci: any) => ({
      name: pick(ci?.product?.name, ci?.Product?.name, 'UNKNOWN'),
      quantity: pick<number>(ci?.quantity, 0)!,
    }));

    // pick one decision if you need a single decision in DTO (or map all if your DTO supports an array)
    const decisionSrc =
      (Array.isArray(r.decisions) && r.decisions[0]) ||
      r.decision ||
      (Array.isArray(r?.Decisions) && r.Decisions[0]);

    return {
      requestNumber: pick<string>(r.requestNumber, r.request_number)!,
      statusId: pick<number>(r.statusId, r.status_id, r.status?.id),
      requestorEmail: pick<string>(r.requestor?.email, r.Requestor?.email), // association 'requestor'
      designation: pick<string>(r.designation, r.designation ?? undefined),
      agency: pick<string>(r.agency, r.agency ?? undefined),
      organization: pick<string>(r.organization, r.organization ?? undefined),
      otherOrganization: pick<string>(r.otherOrganization, r.other_organization),
      pointOfContact: pick<string>(r.pointOfContact, r.point_of_contact),
      email: r.email,
      phoneNumber: pick<string>(r.phoneNumber, r.phone_number),
      requestedToolName: pick<string>(r.requestedToolName, r.requested_tool_name)!,
      description: r.description,
      createdAt: pick<Date>(r.createdAt, r.created_at),
      updatedAt: pick<Date>(r.updatedAt, r.updated_at, r.updateAt), // covers past typo
      decision: decisionSrc ? this._toDecisionDto(decisionSrc) : undefined,
      cartItems,
    };
  }

  private _toDecisionDto(d?: Decision | any): DecisionDto | undefined {
    if (!d) return undefined;

    // If it's a Sequelize instance, clone to a plain object (camelCase keys)
    const row: any =
      typeof d?.get === 'function' ? d.get({ plain: true, clone: true }) : d;

    // helper: first defined
    const pick = <T>(...vals: (T | undefined | null)[]) =>
      vals.find(v => v !== undefined && v !== null);

    return {
      decisionNumber: pick<string>(row.decisionNumber, row.decision_number) ?? '',
      adjudicatorEmail: pick<string>(
        row.adjudicator?.email,
        row.Adjudicator?.email
      ) ?? '',
      statusId: pick<number>(row.statusId, row.status_id, row.status?.id) ?? 0,

      // dates: prefer decisionAt if present, else createdAt; include snake_case fallbacks
      createdAt: (pick<Date | string>(
        row.decisionAt,
        row.decision_at,
        row.createdAt,
        row.created_at
      ) as any) ?? undefined,
      updatedAt: (pick<Date | string>(
        row.updatedAt,
        row.updated_at,
        row.updateAt
      ) as any) ?? undefined,

      comments: row.comments,
    };
  }

}

export default new RequestEndpointService();
