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

/**
 * @swagger
 * components:
 *   schemas:
 *     DecisionDto:
 *       type: object
 *       properties:
 *         decisionNumber:
 *           type: string
 *           example: "DEC-001"
 *         statusId:
 *           type: integer
 *           example: 1
 *         adjudicatorEmail:
 *           type: string
 *           example: "adjudicator@example.com"
 *         comments:
 *           type: string
 *           example: "Approved after review"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-01T12:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-01T12:30:00Z"
 *       required:
 *         - decisionNumber
 *         - statusId
 *         - adjudicatorEmail
 *         - comments
 *         - createdAt
 *         - updatedAt
 */
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
