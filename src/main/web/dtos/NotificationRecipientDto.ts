import { IsBoolean, IsDateString, ValidateNested, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";
import NotificationDto from "./NotificationDto";

/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationRecipientDto:
 *       type: object
 *       properties:
 *         notification:
 *           $ref: '#/components/schemas/NotificationDto'
 *         read:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: '2025-12-10T12:34:56.789Z'
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: '2025-12-10T12:34:56.789Z'
 *       required:
 *         - notification
 *         - read
 *         - createdAt
 *         - updatedAt
 */


interface PropsI {
    notification: NotificationDto;
    read: boolean;
    createdAt: string;
    updatedAt: string;
  }

export default class NotificationRecipientDto {
  @ValidateNested()
  public readonly notification: NotificationDto;

  @IsBoolean()
  public readonly read: boolean;

  @IsDateString()
  public readonly createdAt: string;

  @IsDateString()
  public readonly updatedAt: string;

    constructor(data: PropsI) {
        this.notification = data.notification;
        this.read = data.read;
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