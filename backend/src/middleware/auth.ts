import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { sendError } from "../utils/httpError.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "";
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "auth_token";
const ALLOW_BEARER_AUTH = process.env.ALLOW_BEARER_AUTH === "true";

type AuthPayload = {
  sub: string;
  role: Role;
};

export type AuthRequest = Request & {
  user?: {
    id: string;
    role: Role;
  };
};

export function getCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (rawKey !== name) continue;
    const value = rawValue.join("=");
    return value ? decodeURIComponent(value) : null;
  }
  return null;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const cookieToken = getCookieValue(req.headers.cookie, AUTH_COOKIE_NAME);
  const header = req.headers.authorization ?? "";
  const headerToken = ALLOW_BEARER_AUTH && header.startsWith("Bearer ") ? header.slice(7) : null;
  const token = cookieToken ?? headerToken;

  if (!token) {
    return sendError(res, 401, "Missing auth token", "UNAUTHORIZED");
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });
    if (!user) {
      return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
    }

    const suspensionRows = await prisma.$queryRaw<Array<{ suspendedAt: Date | null }>>`
      SELECT "suspendedAt"
      FROM "User"
      WHERE "id" = ${user.id}
      LIMIT 1
    `;

    if (suspensionRows[0]?.suspendedAt) {
      return sendError(res, 403, "Account is suspended", "FORBIDDEN");
    }
    req.user = { id: user.id, role: user.role };
    return next();
  } catch (error) {
    return sendError(res, 401, "Invalid token", "UNAUTHORIZED");
  }
}

export function requireRole(roles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, "Forbidden", "FORBIDDEN");
    }
    return next();
  };
}
