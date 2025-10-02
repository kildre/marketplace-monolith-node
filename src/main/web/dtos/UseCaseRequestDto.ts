// src/main/web/dtos/UseCaseRequestDto.ts
import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsEmail,
  IsDateString,
  ValidateNested,
  validateSync,
} from 'class-validator';
import ConstraintError from 'src/main/domain/errors/ConstraintError';
import DecisionDto from './DecisionDto';
import CartItemDto from './CartItemDto';

// Accept Date | string from callers/tests:
interface PropsI {
  requestNumber?: string;
  statusId?: number;
  requestorEmail?: string;
  designation?: string;
  agency?: string;
  organization?: string;
  otherOrganization?: string;
  pointOfContact?: string;
  email?: string;
  phoneNumber?: string;
  estimatedRom?: string;
  requestedToolName?: string;
  description?: string;
  createdAt?: string | Date;   // <-- allow Date
  updatedAt?: string | Date;   // <-- allow Date
  decision?: DecisionDto;
  cartItems?: CartItemDto[];
}

export default class UseCaseRequestDto {
  @IsOptional() @IsString() requestNumber?: string;
  @IsOptional() @IsInt() statusId?: number;
  @IsOptional() @IsString() requestorEmail?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() agency?: string;
  @IsOptional() @IsString() organization?: string;
  @IsOptional() @IsString() otherOrganization?: string;
  @IsOptional() @IsString() pointOfContact?: string;
  @IsOptional() @IsEmail()  email?: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() @IsString() estimatedRom?: string;
  @IsOptional() @IsString() requestedToolName?: string;
  @IsOptional() @IsString() description?: string;

  // Internally we store ISO strings and validate as such:
  @IsOptional() @IsDateString() createdAt?: string;
  @IsOptional() @IsDateString() updatedAt?: string;

  @IsOptional() @ValidateNested() decision?: DecisionDto;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) cartItems?: CartItemDto[];

  constructor(data: PropsI) {
    // Normalize Date -> ISO 8601 string
    const toIso = (v?: string | Date) =>
      v instanceof Date ? v.toISOString() : v;

    this.requestNumber     = data.requestNumber;
    this.statusId          = data.statusId;
    this.requestorEmail    = data.requestorEmail;
    this.designation       = data.designation;
    this.agency            = data.agency;
    this.organization      = data.organization;
    this.otherOrganization = data.otherOrganization;
    this.pointOfContact    = data.pointOfContact;
    this.email             = data.email;
    this.phoneNumber       = data.phoneNumber;
    this.estimatedRom      = data.estimatedRom;
    this.requestedToolName = data.requestedToolName;
    this.description       = data.description;
    this.createdAt         = toIso(data.createdAt);  // <-- normalized
    this.updatedAt         = toIso(data.updatedAt);  // <-- normalized
    this.decision          = data.decision;
    this.cartItems         = data.cartItems;

    const errors = validateSync(this, {
      whitelist: false,
      forbidUnknownValues: false,
      skipMissingProperties: true,
    });
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
  }
}
