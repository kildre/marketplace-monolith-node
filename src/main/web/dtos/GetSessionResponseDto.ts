import { IsBoolean, IsNotEmpty, IsOptional, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  sessionId: string;
  token: string;
  refreshToken: string;
}

class Props {
    @IsString()
    @IsNotEmpty()
    sessionId!: string;

    @IsString()
    @IsOptional()
    token!: string;

    @IsString()
    @IsOptional()
    refreshToken!: string;

    constructor(data: PropsI) {
        Object.assign(this, data);
    }     
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GetSessionResponseDto:
 *       type: object
 *       properties:
 *          sessionId: { type: string }
 *          token: { type: string }
 *          refreshToken: { type: string }
 */
export default class GetSessionResponseDto {
    public readonly sessionId!: string;
    public readonly token!: string;
    public readonly refreshToken!: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) throw new ConstraintError(errors);

    this.sessionId = props.sessionId;
    this.token = props.token;
    this.refreshToken = props.refreshToken;
  }
}
