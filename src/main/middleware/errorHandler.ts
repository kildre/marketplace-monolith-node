import { Request, Response, NextFunction } from "express";
import { ValidationError } from "class-validator";
import ErrorDto from "../web/dtos/ErrorDto";
import logger from "../service/loggingService";
import ConstraintError from "../domain/errors/ConstraintError";
import { AuthenticationError } from "../domain/errors/AuthenticationError";
import { UnauthorizedUserError } from "../domain/errors/UnauthorizedUserError";

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Handle AuthenticationError with its custom response format
  if (err instanceof AuthenticationError) {
    logger.error(`[AUTH_ERROR] ${err.toLogMessage()}`);
    return res.status(err.status || 401).json(err.toClientResponse());
  }

  // Handle UnauthorizedUserError with its custom response format
  if (err instanceof UnauthorizedUserError) {
    logger.warn(`[AUTHZ_ERROR] ${err.toLogMessage()}`);
    return res.status(err.status || 403).json(err.toClientResponse());
  }

  const statusCode = (err as any).status || 500;
  const errorClass = err.name || "Error";
  let errMsg = `${errorClass}: ${err.message}`;

  // If it's a ConstraintError, extract and format the validation errors
  if (err instanceof ConstraintError && (err as any).cause) {
    const validationErrors = (err as any).cause as ValidationError[];
    const formattedErrors = formatValidationErrors(validationErrors);
    
    if (formattedErrors.length > 0) {
      errMsg = `${errorClass}: ${formattedErrors.join("; ")}`;
    }
  }

  // Log error message, class, and stack trace
  logger.error(`${errMsg}\n${err.stack}`);

  // Return error DTO
  res.status(statusCode).json(new ErrorDto(errMsg));
}
