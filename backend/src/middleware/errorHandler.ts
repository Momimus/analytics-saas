import type { Request, Response, NextFunction } from "express";
import { HttpError, sendError } from "../utils/httpError.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof HttpError) {
    return sendError(res, err.status, err.message, err.code, err.fieldErrors);
  }

  console.error(err);
  return sendError(res, 500, "Unexpected server error", "INTERNAL_ERROR");
}
