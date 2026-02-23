import type { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/httpError.js";
import { getCookieValue } from "../utils/cookies.js";

type CsrfOptions = {
  cookieName: string;
  headerName?: string;
};

export function createCsrfProtection(options: CsrfOptions) {
  const headerName = (options.headerName ?? "x-csrf-token").toLowerCase();

  return (req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      return next();
    }

    const csrfCookie = getCookieValue(req.headers.cookie, options.cookieName);
    const headerValue = req.headers[headerName];
    const csrfHeader =
      typeof headerValue === "string" ? headerValue : Array.isArray(headerValue) ? headerValue[0] : null;

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return sendError(res, 403, "Invalid CSRF token", "FORBIDDEN");
    }

    return next();
  };
}
