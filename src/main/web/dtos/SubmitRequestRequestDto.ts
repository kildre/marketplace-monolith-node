// Converted from Java: SubmitRequestRequestDto.java
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  MaxLength,
  ArrayMaxSize,
  validateSync,
} from "class-validator";
import { Type, plainToInstance } from "class-transformer";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import CartItemDto, { CartItemProps } from "./CartItemDto";

interface PropsI {
  requestNumber?: string;
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
  cartItems?: CartItemDto[];
}

class Props {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  requestNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  requestorEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  designation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  agency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  organization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  otherOrganization?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  pointOfContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  estimatedRom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  requestedToolName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CartItemProps)
  cartItems?: CartItemProps[];

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     SubmitRequestRequestDto:
 *       type: object
 *       properties:
 *         requestNumber:
 *           type: string
 *           example: "REQ-789"
 *         requestorEmail:
 *           type: string
 *           example: "requestor@example.com"
 *         designation:
 *           type: string
 *           example: "Analyst"
 *         agency:
 *           type: string
 *           example: "Agency Name"
 *         organization:
 *           type: string
 *           example: "Organization Name"
 *         otherOrganization:
 *           type: string
 *           example: "Other Org"
 *         pointOfContact:
 *           type: string
 *           example: "Jane Doe"
 *         email:
 *           type: string
 *           example: "jane.doe@example.com"
 *         phoneNumber:
 *           type: string
 *           example: "555-123-4567"
 *         estimatedRom:
 *           type: string
 *           example: "10000"
 *         requestedToolName:
 *           type: string
 *           example: "Tool X"
 *         description:
 *           type: string
 *           example: "Requesting access to Tool X for project Y."
 *         cartItems:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItemDto'
 */
export default class SubmitRequestRequestDto {
  public readonly requestNumber?: string;
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
  public readonly cartItems?: CartItemDto[];

  constructor(data: PropsI) {
    const props = plainToInstance(Props, data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.requestNumber = props.requestNumber;
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
    // Map to validated DTO instances (redundant validation should be no-op)
    this.cartItems = props.cartItems?.map((ci) => new CartItemDto(ci));
  }
}
