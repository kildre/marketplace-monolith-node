import { IsNotEmpty, IsString, validateSync, IsOptional } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  sessionId: string;
  accessToken: string;
  refreshToken?: string;
}

class Props {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterSessionRequestDto:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *           description: "Frontend-generated session identifier (UUID or secure token)"
 *           example: "43bdbd32-bf48-4ce6-a57c-b7a0e02d164a"
 *         refreshToken:
 *           type: string
 *           description: "Optional Keycloak refresh token"
 *       required:
 *         - sessionId
 *         - accessToken
 */
export default class RegisterSessionRequestDto {
  public readonly sessionId!: string;
  public readonly refreshToken?: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }

    this.sessionId = props.sessionId;
    this.refreshToken = props.refreshToken;
  }
}
