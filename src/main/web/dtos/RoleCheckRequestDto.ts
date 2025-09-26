import { IsNotEmpty, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  userEmail: string;
}

class Props {
  @IsString()
  @IsNotEmpty()
  userEmail!: string;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

export default class RoleCheckRequestDto {
  public readonly userEmail!: string;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }

    // Since this is the final object, it is critical that only the desired props are set
    this.userEmail = props.userEmail;
  }
}
