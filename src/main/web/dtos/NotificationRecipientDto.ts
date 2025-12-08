import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";


interface PropsI {
    id: number;
    title: string;
    message: string;
    read: boolean;
    priorityLevel: number;
    createdAt: string;
    updatedAt: string;
  }

export default class NotificationRecipientDto {
  @IsInt()
  public readonly id: number;

  @IsString()
  @IsNotEmpty()
  public readonly title: string;

  @IsString()
  @IsNotEmpty()
  public readonly message: string;

  @IsBoolean()
  public readonly read: boolean;

  @IsInt()
  public readonly priorityLevel: number;

  @IsDateString()
  public readonly createdAt: string;

  @IsDateString()
  public readonly updatedAt: string;

    constructor(data: PropsI) {
        this.id = data.id;
        this.title = data.title;
        this.message = data.message;
        this.read = data.read;
        this.priorityLevel = data.priorityLevel;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;

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