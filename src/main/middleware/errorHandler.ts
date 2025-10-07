import { Request, Response, NextFunction } from "express";
import ErrorDto from "../web/dtos/ErrorDto";
import logger from "../service/loggingService";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = (err as any).status || 500;
  const errorClass = err.name || "Error";
  const errMsg = `${errorClass}: ${err.message}`;

  // Log error message, class, and stack trace
  logger.error(`${errMsg}\n${err.stack}`);

  // Return error DTO
  res.status(statusCode).json(new ErrorDto(errMsg));
}
