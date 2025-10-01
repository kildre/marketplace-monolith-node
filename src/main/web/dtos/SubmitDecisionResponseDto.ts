// Converted from Java: SubmitDecisionResponseDto.java
import { IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  decisionNumber: string;
  errMsg?: string;
}

class Props {
  @IsString()
  decisionNumber!: string;
  errMsg?: string;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     SubmitDecisionResponseDto:
 *       type: object
 *       properties:
 *         decisionNumber:
 *           type: string
 *           example: "DEC-123"
 *         errMsg:
 *           type: string
 *           example: ""
 *       required:
 *         - decisionNumber
 */
export default class SubmitDecisionResponseDto {
  public readonly decisionNumber!: string;
  public readonly errMsg!: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.decisionNumber = props.decisionNumber;
    this.errMsg = props.errMsg ?? "";
  }
}
