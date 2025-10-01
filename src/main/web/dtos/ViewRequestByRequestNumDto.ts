// Converted from Java: ViewRequestsRequestDto.java
import { IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  userEmail: string;
  requestNumber: string;
}

class Props {
  @IsString()
  requestNumber!: string;

  @IsString()
  userEmail!: string;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ViewRequestByRequestNumDto:
 *       type: object
 *       properties:
 *         requestNumber:
 *           type: string
 *           example: "REQ-12345"
 *         userEmail:
 *           type: string
 *           example: "user@example.com"
 *       required:
 *         - requestNumber
 *         - userEmail
 */
export default class ViewRequestByRequestNumDto {
  public readonly requestNumber!: string;
  public readonly userEmail!: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.requestNumber = props.requestNumber;
    this.userEmail = props.userEmail;
  }
}
