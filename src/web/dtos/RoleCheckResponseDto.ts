import { IsString, validateSync } from "class-validator";
import ConstraintError from "src/domain/errors/ConstraintError";

interface PropsI {
  hasRole?: Boolean | null;
  errMsg?: string;
}

class Props {
  hasRole: Boolean | null = null;

  @IsString()
  errMsg: string = "";

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

export default class RoleCheckResponseDto {
  public readonly hasRole!: Boolean | null;
  public readonly errMsg!: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }

    // Since this is the final object, it is critical that only the desired props are set
    this.hasRole = props.hasRole;
    this.errMsg = props.errMsg;
  }
}
