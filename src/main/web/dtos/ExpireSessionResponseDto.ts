import { IsBoolean, IsOptional, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  success: boolean;
  message?: string;
}

class Props {
  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @IsString()
  message?: string;

  constructor(data: PropsI) {
    this.success = data.success;
    this.message = data.message;
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ExpireSessionResponseDto:
 *       type: object
 *       properties:
 *         success: { type: boolean }
 *         message: { type: string }
 */
export default class ExpireSessionResponseDto {
  public readonly success!: boolean;
  public readonly message?: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) throw new ConstraintError(errors);

    this.success = props.success;
    this.message = props.message;
  }
}
