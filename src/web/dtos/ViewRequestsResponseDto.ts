// Converted from Java: ViewRequestsResponseDto.java
import { IsArray, IsString, validateSync } from "class-validator";
import ConstraintError from "src/domain/errors/ConstraintError";
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
