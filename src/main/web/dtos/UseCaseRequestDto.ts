// Converted from Java: UseCaseRequestDto.java
import {
  IsString,
  IsOptional,
  IsInt,
  IsDate,
  IsArray,
  ValidateNested,
  validateSync,
} from "class-validator";
import { Type } from "class-transformer";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import DecisionDto from "./DecisionDto";
import CartItemDto from "./CartItemDto";

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
  createdAt?: Date;
  updatedAt?: Date;
  decision?: DecisionDto;
  cartItems?: CartItemDto[];
}

class Props {
  @IsOptional()
  @IsString()
  requestNumber?: string;

  @IsOptional()
  @IsInt()
  statusId?: number;

  @IsOptional()
  @IsString()
  requestorEmail?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  agency?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  otherOrganization?: string;

  @IsOptional()
  @IsString()
  pointOfContact?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  estimatedRom?: string;

  @IsOptional()
  @IsString()
  requestedToolName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDate()
  createdAt?: Date;

  @IsOptional()
  @IsDate()
  updatedAt?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => DecisionDto)
  decision?: DecisionDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cartItems?: CartItemDto[];

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

export default class UseCaseRequestDto {
  public readonly requestNumber?: string;
  public readonly statusId?: number;
  public readonly requestorEmail?: string;
  public readonly designation?: string;
  public readonly agency?: string;
  public readonly organization?: string;
  public readonly otherOrganization?: string;
  public readonly pointOfContact?: string;
  public readonly email?: string;
  public readonly phoneNumber?: string;
  public readonly estimatedRom?: string;
  public readonly requestedToolName?: string;
  public readonly description?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;
  public readonly decision?: DecisionDto;
  public readonly cartItems?: CartItemDto[];

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.requestNumber = props.requestNumber;
    this.statusId = props.statusId;
    this.requestorEmail = props.requestorEmail;
    this.designation = props.designation;
    this.agency = props.agency;
    this.organization = props.organization;
    this.otherOrganization = props.otherOrganization;
    this.pointOfContact = props.pointOfContact;
    this.email = props.email;
    this.phoneNumber = props.phoneNumber;
    this.estimatedRom = props.estimatedRom;
    this.requestedToolName = props.requestedToolName;
    this.description = props.description;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.decision = props.decision;
    this.cartItems = props.cartItems;
  }
}
