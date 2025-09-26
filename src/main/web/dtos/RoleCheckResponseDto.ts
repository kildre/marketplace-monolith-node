import { IsBoolean, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  hasRole: boolean;
}

class Props {
  @IsBoolean()
  hasRole!: boolean;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

export default class RoleCheckResponseDto {
  public readonly hasRole!: boolean;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }

    // Since this is the final object, it is critical that only the desired props are set
    this.hasRole = props.hasRole;
  }
}
