// src/main/web/dtos/UseCaseRequestDto.ts
import {
  IsString,
  IsOptional,
  IsInt,
  IsDateString,
  IsArray,
  validateSync,
  IsEmail,
} from 'class-validator';
import ConstraintError from 'src/main/domain/errors/ConstraintError';
import DecisionDto from './DecisionDto';
import CartItemDto from './CartItemDto';

// Incoming shape (plain JSON)
export interface UseCaseRequestDtoInput {
  requestNumber?: unknown;
  statusId?: unknown;               // may be string/number
  requestorEmail?: unknown;
  designation?: unknown;
  agency?: unknown;
  organization?: unknown;
  otherOrganization?: unknown;
  pointOfContact?: unknown;
  email?: unknown;
  phoneNumber?: unknown;
  estimatedRom?: unknown;
  requestedToolName?: unknown;
  description?: unknown;
  createdAt?: unknown;              // expect ISO string
  updatedAt?: unknown;              // expect ISO string
  decision?: unknown;               // plain object -> DecisionDto
  cartItems?: unknown;              // array of plain -> CartItemDto[]
}

function toStringOrUndef(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

function toNumberOrUndef(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function toIsoOrUndef(v: unknown): string | undefined {
  const s = toStringOrUndef(v);
  if (!s) return undefined;
  // light sanity check; the @IsDateString validator will enforce format
  return s;
}

export default class UseCaseRequestDto {
  @IsOptional()
  @IsString()
  public readonly requestNumber?: string;

  @IsOptional()
  @IsInt()
  public readonly statusId?: number;

  @IsOptional()
  @IsString()
  public readonly requestorEmail?: string;

  @IsOptional()
  @IsString()
  public readonly designation?: string;

  @IsOptional()
  @IsString()
  public readonly agency?: string;

  @IsOptional()
  @IsString()
  public readonly organization?: string;

  @IsOptional()
  @IsString()
  public readonly otherOrganization?: string;

  @IsOptional()
  @IsString()
  public readonly pointOfContact?: string;

  @IsOptional()
  @IsEmail()
  public readonly email?: string;

  @IsOptional()
  @IsString()
  public readonly phoneNumber?: string;

  @IsOptional()
  @IsString()
  public readonly estimatedRom?: string;

  @IsOptional()
  @IsString()
  public readonly requestedToolName?: string;

  @IsOptional()
  @IsString()
  public readonly description?: string;

  @IsOptional()
  @IsDateString()
  public readonly createdAt?: string;      // ISO string

  @IsOptional()
  @IsDateString()
  public readonly updatedAt?: string;      // ISO string

  // We skip @ValidateNested here; the child DTOs validate themselves.
  public readonly decision?: DecisionDto;

  @IsOptional()
  @IsArray()
  public readonly cartItems?: CartItemDto[];

  constructor(input: UseCaseRequestDtoInput = {}) {
    // Manual normalization/coercion
    this.requestNumber   = toStringOrUndef(input.requestNumber);
    this.statusId        = toNumberOrUndef(input.statusId);
    this.requestorEmail  = toStringOrUndef(input.requestorEmail);
    this.designation     = toStringOrUndef(input.designation);
    this.agency          = toStringOrUndef(input.agency);
    this.organization    = toStringOrUndef(input.organization);
    this.otherOrganization = toStringOrUndef(input.otherOrganization);
    this.pointOfContact  = toStringOrUndef(input.pointOfContact);
    this.email           = toStringOrUndef(input.email);
    this.phoneNumber     = toStringOrUndef(input.phoneNumber);
    this.estimatedRom    = toStringOrUndef(input.estimatedRom);
    this.requestedToolName = toStringOrUndef(input.requestedToolName);
    this.description     = toStringOrUndef(input.description);
    this.createdAt       = toIsoOrUndef(input.createdAt);
    this.updatedAt       = toIsoOrUndef(input.updatedAt);

    // Nested objects — construct DTOs so they run their own validation
    this.decision = input.decision
      ? new DecisionDto(input.decision as any)
      : undefined;

    const items = Array.isArray(input.cartItems) ? input.cartItems : undefined;
    this.cartItems = items?.map((it) => new CartItemDto(it as any));

    // Validate this object
    const errors = validateSync(this, { whitelist: false, forbidUnknownValues: false });
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
  }
}
