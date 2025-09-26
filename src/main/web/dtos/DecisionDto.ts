import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsDate,
  validateSync,
} from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  decisionNumber: string;
  statusId: number;
  adjudicatorEmail: string;
  comments: string;
  createdAt: Date;
  updatedAt: Date;
}

class Props {
  @IsString()
  @IsNotEmpty()
  decisionNumber!: string;

  @IsInt()
  statusId!: number;

  @IsString()
  @IsNotEmpty()
  adjudicatorEmail!: string;

  @IsString()
  @IsNotEmpty()
  comments!: string;

  @IsDate()
  @IsNotEmpty()
  createdAt!: Date;

  @IsDate()
  @IsNotEmpty()
  updatedAt!: Date;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

export default class DecisionDto {
  public readonly decisionNumber!: string;
  public readonly statusId!: number;
  public readonly adjudicatorEmail!: string;
  public readonly comments!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }

    // Since this is the final object, it is critical that only the desired props are set
    this.decisionNumber = props.decisionNumber;
    this.statusId = props.statusId;
    this.adjudicatorEmail = props.adjudicatorEmail;
    this.comments = props.comments;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
