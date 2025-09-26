// Converted from Java: SubmitRequestResponseDto.java
import { IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  requestNumber: string;
}

class Props {
  @IsString()
  requestNumber!: string;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

export default class SubmitRequestResponseDto {
  public readonly requestNumber!: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.requestNumber = props.requestNumber;
  }
}
