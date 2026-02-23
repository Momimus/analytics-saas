import type { Role } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { HttpError } from "../../utils/httpError.js";
import type { AuthRequest } from "../../middleware/auth.js";

export const RETURN_ADMIN_RESET_TOKEN = process.env.ADMIN_RETURN_RESET_TOKEN === "true";

export type AuditDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  count: (args?: unknown) => Promise<number>;
};

export function getAuditDelegate(): AuditDelegate | null {
  const delegate = (prisma as unknown as { auditLog?: AuditDelegate }).auditLog;
  return delegate ?? null;
}

export async function getUserSuspendedAt(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ suspendedAt: Date | null }>>`
    SELECT "suspendedAt"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;
  return rows[0]?.suspendedAt ?? null;
}

export async function setUserSuspendedAt(userId: string, suspendedAt: Date | null) {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "suspendedAt" = ${suspendedAt}
    WHERE "id" = ${userId}
  `;
}

export function getActor(req: AuthRequest) {
  if (!req.user) {
    throw new HttpError(401, "Unauthorized");
  }
  return req.user;
}

export function parsePositiveInt(value: unknown, fallback: number, min: number, max: number) {
  const num = typeof value === "string" && value.trim() ? Number(value) : fallback;
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new HttpError(400, `Value must be an integer between ${min} and ${max}`);
  }
  return num;
}

export function normalizeOptionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "Invalid payload");
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new HttpError(400, `Value must be at most ${maxLength} characters`);
  }
  return trimmed;
}

export function buildUsersWhereSql(
  PrismaLib: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => unknown;
    join: (values: unknown[], separator?: string) => unknown;
    empty: unknown;
  },
  roleFilter: Role | null,
  statusRaw: string,
  searchRaw: string
) {
  const clauses: unknown[] = [];
  if (roleFilter) {
    clauses.push(PrismaLib.sql`u."role" = ${roleFilter}`);
  }
  if (statusRaw === "active") {
    clauses.push(PrismaLib.sql`u."suspendedAt" IS NULL`);
  } else if (statusRaw === "suspended") {
    clauses.push(PrismaLib.sql`u."suspendedAt" IS NOT NULL`);
  }
  if (searchRaw) {
    const searchLike = `%${searchRaw}%`;
    clauses.push(
      PrismaLib.sql`(u."email" ILIKE ${searchLike} OR COALESCE(u."fullName", '') ILIKE ${searchLike})`
    );
  }
  return clauses.length ? PrismaLib.sql`WHERE ${PrismaLib.join(clauses, " AND ")}` : PrismaLib.empty;
}
