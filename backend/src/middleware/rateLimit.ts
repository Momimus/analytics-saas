import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/httpError.js";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
};

const store = new Map<string, RateLimitRecord>();

function nowMs() {
  return Date.now();
}

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0]?.trim() ?? req.ip;
  }
  return req.ip;
}

export function hashIdentifier(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createRateLimiter(options: RateLimitOptions) {
  const windowMs = options.windowMs;
  const max = options.max;
  const keyGenerator = options.keyGenerator ?? ((req: Request) => getClientIp(req));

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const current = nowMs();
    const existing = store.get(key);

    if (!existing || current >= existing.resetAt) {
      store.set(key, { count: 1, resetAt: current + windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count > max) {
      return sendError(res, 429, options.message, "CONFLICT");
    }

    return next();
  };
}

