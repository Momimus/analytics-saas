import type { Role } from "@prisma/client";
import prisma from "../lib/prisma.js";

type AuditLogInput = {
  actorId?: string | null;
  actorRole?: Role | string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(input: AuditLogInput) {
  try {
    const delegate = (prisma as unknown as { auditLog?: { create: (args: unknown) => Promise<unknown> } }).auditLog;
    if (!delegate) {
      return;
    }

    await delegate.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? {},
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (error) {
    console.error("AUDIT_LOG_WRITE_FAILED", error);
  }
}
