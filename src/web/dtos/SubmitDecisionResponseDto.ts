// Converted from Java: SubmitDecisionResponseDto.java
import { IsString, validateSync } from "class-validator";
import ConstraintError from "src/domain/errors/ConstraintError";

interface PropsI {
  decisionNumber: string;
}

class Props {
  @IsString()
  decisionNumber!: string;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

export default class SubmitDecisionResponseDto {
  public readonly decisionNumber!: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.decisionNumber = props.decisionNumber;
  }
}
