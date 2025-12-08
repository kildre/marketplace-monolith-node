import { IsNotEmpty, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";


interface PropsI {
    currentUserEmail: string;
  }

export default class GetVisibleNotificationRecipientsRequestDto {
  @IsString()
  @IsNotEmpty()
  public readonly currentUserEmail: string;

  constructor(data: PropsI) {
    this.currentUserEmail = data.currentUserEmail;

    const errors = validateSync(this, {
      whitelist: false,
      forbidUnknownValues: false,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
  }
}