import type { Response } from "express";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type ErrorBody = {
  ok: false;
  error: ErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
};

function codeFromStatus(status: number): ErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  return "INTERNAL_ERROR";
}

export class HttpError extends Error {
  status: number;
  code: ErrorCode;
  fieldErrors?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    code: ErrorCode = codeFromStatus(status),
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function makeErrorBody(
  status: number,
  message: string,
  code: ErrorCode = codeFromStatus(status),
  fieldErrors?: Record<string, string>
): ErrorBody {
  return {
    ok: false,
    error: code,
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  code: ErrorCode = codeFromStatus(status),
  fieldErrors?: Record<string, string>
) {
  return res.status(status).json(makeErrorBody(status, message, code, fieldErrors));
}

export function assertNonEmptyString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, message);
  }
  return value.trim();
}
