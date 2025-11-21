import { IsBoolean, IsNotEmpty, IsOptional, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  sessionId: string;
  stored: boolean;
}

class Props {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  stored!: boolean;

  constructor(data: PropsI) {
    this.sessionId = data.sessionId;
    this.stored = data.stored;
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterSessionResponseDto:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *         stored:
 *           type: boolean
 */
export default class RegisterSessionResponseDto {
  public readonly sessionId!: string;
  public readonly stored!: boolean;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) throw new ConstraintError(errors);

    this.sessionId = props.sessionId;
    this.stored = props.stored;
  }
}
