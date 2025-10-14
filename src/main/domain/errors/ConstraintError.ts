import { ValidationError } from "class-validator";
import MarketplaceError from "./MarketplaceError";

export default class ConstraintError extends MarketplaceError {

    static errMsgFmt = "Constraint validation failed!";

    constructor(errors: ValidationError[]) {
        super(ConstraintError.errMsgFmt, {cause: errors});
        this.name = "ConstraintError";

        // Fix prototype chain (important for instanceof checks)
        Object.setPrototypeOf(this, new.target.prototype);
    }

}