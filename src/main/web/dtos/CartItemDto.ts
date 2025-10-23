import { IsInt, IsNotEmpty, IsString, validateSync } from "class-validator";
import ConstraintError from "src/main/domain/errors/ConstraintError";

export interface CartItemPropsI {
  name: string;
  quantity: number;
}

export class CartItemProps {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  quantity!: number;

  constructor(data?: CartItemPropsI) {
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

  constructor(data: CartItemPropsI) {
    const props = new CartItemProps(data);
    const errors = validateSync(props);

    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }

    // Since this is the final object, it is critical that only the desired props are set
    this.name = props.name;
    this.quantity = props.quantity;
  }
}
