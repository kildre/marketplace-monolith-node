// Converted from Java: MarketplaceSummaryReport.java
import { IsInt, IsString, validateSync } from "class-validator";
import ConstraintError from "src/domain/errors/ConstraintError";

interface PropsI {
  totalUsers: number;
  totalUseCases: number;
  totalOrders: number;
}

class Props {
  @IsInt()
  totalUsers!: number;

  @IsInt()
  totalUseCases!: number;

  @IsInt()
  totalOrders!: number;

  constructor(data: PropsI) {
    Object.assign(this, data);
  }
}

export default class MarketplaceSummaryReport {
  public readonly totalUsers!: number;
  public readonly totalUseCases!: number;
  public readonly totalOrders!: number;

  constructor(data: PropsI) {
    const props = new Props(data);
    const errors = validateSync(props);
    if (errors.length > 0) {
      throw new ConstraintError(errors);
    }
    this.totalUsers = props.totalUsers;
    this.totalUseCases = props.totalUseCases;
    this.totalOrders = props.totalOrders;
  }
}
