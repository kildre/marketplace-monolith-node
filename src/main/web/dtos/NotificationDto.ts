import { IsDateString, IsInt, IsNotEmpty, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationDto:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: "Notification 1"
 *         message:
 *           type: string
 *           example: "This is the first Notification"
 *         priorityLevel:
 *           type: integer
 *           example: 3
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-12-10T12:34:56.789Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-12-10T12:34:56.789Z"
 *       required:
 *         - id
 *         - title
 *         - message
 *         - priorityLevel
 *         - createdAt
 *         - updatedAt
 */


interface PropsI {
    id: number;
    title: string;
    message: string;
    priorityLevel: number;
    createdAt: string;
    updatedAt: string;
  }

export default class NotificationDto {
  @IsInt()
  public readonly id: number;

  @IsString()
  @IsNotEmpty()
  public readonly title: string;

  @IsString()
  @IsNotEmpty()
  public readonly message: string;

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