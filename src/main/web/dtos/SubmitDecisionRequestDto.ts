// Converted from Java: SubmitDecisionRequestDto.java
import {
  IsString,
  IsInt,
  IsOptional,
  IsNumber,
  validateSync,
} from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  decisionNumber?: string;
  requestNumber?: string;
  adjudicatorEmail?: string;
  statusId?: number;
  comments?: string;
  ticketType?: string;
  asset?: string;
  quantity?: number;
  estimatedPrice?: number;
}

class Props {
  @IsOptional()
  @IsString()
  decisionNumber?: string;

  @IsOptional()
  @IsString()
  requestNumber?: string;

  @IsOptional()
  @IsString()
  adjudicatorEmail?: string;

  @IsOptional()
  @IsInt()
  statusId?: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  ticketType?: string;

  @IsOptional()
  @IsString()
  asset?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  estimatedPrice?: number;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

export default class SubmitDecisionRequestDto {
  public readonly decisionNumber?: string;
  public readonly requestNumber?: string;
  public readonly adjudicatorEmail?: string;
  public readonly statusId?: number;
  public readonly comments?: string;
  public readonly ticketType?: string;
  public readonly asset?: string;
  public readonly quantity?: number;
  public readonly estimatedPrice?: number;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.decisionNumber = props.decisionNumber;
    this.requestNumber = props.requestNumber;
    this.adjudicatorEmail = props.adjudicatorEmail;
    this.statusId = props.statusId;
    this.comments = props.comments;
    this.ticketType = props.ticketType;
    this.asset = props.asset;
    this.quantity = props.quantity;
    this.estimatedPrice = props.estimatedPrice;
  }
}
