import type { Request } from "express";

export function getRequestMeta(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string" && forwarded.trim().length > 0
      ? forwarded.split(",")[0]?.trim() ?? req.ip
      : req.ip;

  const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null;

  return {
    ip: ip ?? null,
    userAgent,
  };
}

