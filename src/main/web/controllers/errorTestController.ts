import { Request, Response, NextFunction } from "express";

export function throwTestError(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const err = new Error("This is a test error!");
  err.name = "TestError";
  (err as any).statusCode = 400;
  next(err);
}

export function throwConstraintError(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const ConstraintError =
    require("../../domain/errors/ConstraintError").default;
  next(new ConstraintError("Constraint validation failed"));
}
