// Converted from Java: ViewRequestsRequestDto.java
import { IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  userEmail: string;
}

class Props {
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
 *     ViewRequestsRequestDto:
 *       type: object
 *       properties:
 *         userEmail:
 *           type: string
 *           example: "user@example.com"
 *       required:
 *         - userEmail
 */
export default class ViewRequestsRequestDto {
  public readonly userEmail!: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.userEmail = props.userEmail;
  }
}
