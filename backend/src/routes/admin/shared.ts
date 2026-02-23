import prisma from "../../lib/prisma.js";
import { HttpError } from "../../utils/httpError.js";

export type AuditDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  count: (args?: unknown) => Promise<number>;
};

export function getAuditDelegate(): AuditDelegate | null {
  const delegate = (prisma as unknown as { auditLog?: AuditDelegate }).auditLog;
  return delegate ?? null;
}

export function parsePositiveInt(value: unknown, fallback: number, min: number, max: number) {
  const num = typeof value === "string" && value.trim() ? Number(value) : fallback;
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new HttpError(400, `Value must be an integer between ${min} and ${max}`);
  }
  return num;
}
