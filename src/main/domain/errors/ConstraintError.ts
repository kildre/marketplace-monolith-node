import { ValidationError } from "class-validator";
import MarketplaceError from "./MarketplaceError";

/**
 * Recursively extract all validation error messages from ValidationError tree
 */
function formatValidationErrors(errors: ValidationError[], prefix = ''): string[] {
  const messages: string[] = [];
  
  for (const error of errors) {
    const propertyPath = error.property && error.property.length > 0
      ? (prefix ? `${prefix}.${error.property}` : error.property)
      : prefix; // avoid trailing '.undefined'
    
    // If this error has constraints, add them
    if (error.constraints) {
      const constraints = Object.values(error.constraints).join(", ");
      messages.push(`${propertyPath || '(value)'}: ${constraints}`);
    }
    
    // If this error has nested children (e.g., array/object validation), recurse
    if (error.children && error.children.length > 0) {
      messages.push(...formatValidationErrors(error.children, propertyPath));
    }
  }
  
  return messages;
}

export default class ConstraintError extends MarketplaceError {

    static errMsgFmt = "Constraint validation failed!";

    constructor(errors: ValidationError[]) {

        let errMsg = ConstraintError.errMsgFmt;

        if (errors && errors.length > 0) {
            const formattedErrors = formatValidationErrors(errors);
        
            if (formattedErrors.length > 0) {
                errMsg = `${formattedErrors.join("; ")}`;
            }
        }

        super(errMsg, {cause: errors});
        this.name = "ConstraintError";

        // Fix prototype chain (important for instanceof checks)
        Object.setPrototypeOf(this, new.target.prototype);
    }

}