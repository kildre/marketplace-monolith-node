import { Request, Response, NextFunction } from "express";
import { ValidationError } from "class-validator";
import ErrorDto from "../web/dtos/ErrorDto";
import logger from "../service/loggingService";
import ConstraintError from "../domain/errors/ConstraintError";
import { AuthenticationError } from "../domain/errors/AuthenticationError";
import { UnauthorizedUserError } from "../domain/errors/UnauthorizedUserError";

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

  // Log error message, class, and stack trace
  logger.error(`${errMsg}\n${err.stack}`);

  // Return error DTO
  res.status(statusCode).json(new ErrorDto(errMsg));
}
