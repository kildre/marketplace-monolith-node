// Converted from Java: ViewRequestsResponseDto.java
import { IsArray, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import UseCaseRequestDto from "./UseCaseRequestDto";

interface PropsI {
  requests: UseCaseRequestDto[];
}

class Props {
  @IsArray()
  requests!: UseCaseRequestDto[];

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ViewRequestsResponseDto:
 *       type: object
 *       properties:
 *         requests:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UseCaseRequestDto'
 *       required:
 *         - requests
 */
export default class ViewRequestsResponseDto {
  public readonly requests!: UseCaseRequestDto[];

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.requests = props.requests;
  }
}
