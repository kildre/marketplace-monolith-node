import { IsInt, IsNotEmpty, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

interface PropsI {
  name: string;
  quantity: number;
}

class Props {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  quantity!: number;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItemDto:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Sample Product"
 *         quantity:
 *           type: integer
 *           example: 2
 *       required:
 *         - name
 *         - quantity
 */
export default class CartItemDto {
  public readonly name!: string;
  public readonly quantity!: number;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);

    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }

    // Since this is the final object, it is critical that only the desired props are set
    this.name = props.name;
    this.quantity = props.quantity;
  }
}
