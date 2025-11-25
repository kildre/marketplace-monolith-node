import { IsNotEmpty, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  sessionId: string;
}

class Props {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ExpireSessionRequestDto:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *           example: "43bdbd32-bf48-4ce6-a57c-b7a0e02d164a"
 *       required:
 *         - sessionId
 */
export default class ExpireSessionRequestDto {
  public readonly sessionId!: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }

    this.sessionId = props.sessionId;
  }
}
