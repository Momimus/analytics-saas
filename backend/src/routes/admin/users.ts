import crypto from "crypto";
import { Router } from "express";
import type { Response } from "express";
import { Prisma, Role } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { writeAuditLog } from "../../services/auditService.js";
import { assertNonEmptyString, sendError } from "../../utils/httpError.js";
import { getRequestMeta } from "../../utils/requestMeta.js";
import {
  RETURN_ADMIN_RESET_TOKEN,
  buildUsersWhereSql,
  getActor,
  getUserSuspendedAt,
  normalizeOptionalText,
  parsePositiveInt,
  setUserSuspendedAt,
} from "./shared.js";

const router = Router();

router.get(
  "/users",
  asyncHandler(async (req: AuthRequest, res) => {
    const page = parsePositiveInt(req.query.page, 1, 1, 10000);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 1, 100);
    const roleRaw = typeof req.query.role === "string" ? req.query.role.trim().toUpperCase() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "";
    const searchRaw = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const roleFilter = roleRaw === "ADMIN" || roleRaw === "INSTRUCTOR" || roleRaw === "STUDENT"
      ? (roleRaw as Role)
      : null;
    const whereSql = buildUsersWhereSql(Prisma, roleFilter, statusRaw, searchRaw);
    const offset = (page - 1) * pageSize;

    const [countRows, users] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "User" u
        ${whereSql}
      `),
      prisma.$queryRaw<
        Array<{
          id: string;
          email: string;
          role: Role;
          fullName: string | null;
          createdAt: Date;
          suspendedAt: Date | null;
        }>
      >(Prisma.sql`
        SELECT
          u."id",
          u."email",
          u."role",
          u."fullName",
          u."createdAt",
          u."suspendedAt"
        FROM "User" u
        ${whereSql}
        ORDER BY u."createdAt" DESC
        OFFSET ${offset}
        LIMIT ${pageSize}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0n);
    return res.json({
      users,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  })
);

router.patch(
  "/users/:id/suspend",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const userId = assertNonEmptyString(req.params.id, "User id is required");
    const reason = normalizeOptionalText(req.body?.reason, 1000);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true, createdAt: true },
    });

    if (!target) {
      return sendError(res, 404, "User not found", "NOT_FOUND");
    }

    if (target.role === Role.ADMIN) {
      return sendError(res, 409, "Cannot suspend the active admin account", "CONFLICT");
    }

    const currentSuspendedAt = await getUserSuspendedAt(userId);
    const nextSuspendedAt = currentSuspendedAt ?? new Date();
    await setUserSuspendedAt(userId, nextSuspendedAt);
    const updated = {
      ...target,
      suspendedAt: nextSuspendedAt,
    };

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "USER_SUSPENDED",
      entityType: "User",
      entityId: userId,
      metadata: { reason },
      ip,
      userAgent,
    });

    return res.json({ ok: true, user: updated });
  })
);

router.patch(
  "/users/:id/activate",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const userId = assertNonEmptyString(req.params.id, "User id is required");
    const reason = normalizeOptionalText(req.body?.reason, 1000);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    if (!target) {
      return sendError(res, 404, "User not found", "NOT_FOUND");
    }

    await setUserSuspendedAt(userId, null);
    const updated = {
      ...target,
      suspendedAt: null,
    };

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "USER_ACTIVATED",
      entityType: "User",
      entityId: userId,
      metadata: { reason },
      ip,
      userAgent,
    });

    return res.json({ ok: true, user: updated });
  })
);

async function updateUserRole(req: AuthRequest, res: Response) {
  const actor = getActor(req);
  const { ip, userAgent } = getRequestMeta(req);
  const userId = assertNonEmptyString(req.params.id, "User id is required");
  const roleRaw = typeof req.body?.role === "string" ? req.body.role.trim().toUpperCase() : "";

  if (!roleRaw || !["STUDENT", "INSTRUCTOR", "ADMIN"].includes(roleRaw)) {
    return sendError(res, 400, "Role must be STUDENT, INSTRUCTOR, or ADMIN", "VALIDATION_ERROR");
  }

  if (roleRaw === "ADMIN") {
    return sendError(res, 409, "Use /admin/users/:id/transfer-admin to transfer admin access", "CONFLICT");
  }

  const nextRole = roleRaw as Role;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, createdAt: true },
  });
  if (!target) {
    return sendError(res, 404, "User not found", "NOT_FOUND");
  }
  if (target.role === Role.ADMIN) {
    return sendError(res, 409, "Cannot demote admin from this endpoint", "CONFLICT");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: nextRole },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  await writeAuditLog({
    actorId: actor.id,
    actorRole: actor.role,
    action: "USER_ROLE_CHANGED",
    entityType: "User",
    entityId: userId,
    metadata: { fromRole: target.role, toRole: nextRole },
    ip,
    userAgent,
  });

  return res.json({ user: updated });
}

router.patch(
  "/users/:id/role",
  asyncHandler(async (req: AuthRequest, res) => updateUserRole(req, res))
);

router.post(
  "/users/:id/role",
  asyncHandler(async (req: AuthRequest, res) => updateUserRole(req, res))
);

router.post(
  "/users/:id/transfer-admin",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const targetUserId = assertNonEmptyString(req.params.id, "User id is required");
    const reason = normalizeOptionalText(req.body?.reason, 1000);

    if (targetUserId === actor.id) {
      return sendError(res, 400, "Transfer target must be another user", "VALIDATION_ERROR");
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, email: true, createdAt: true },
    });

    if (!target) {
      return sendError(res, 404, "User not found", "NOT_FOUND");
    }

    const targetSuspendedAt = await getUserSuspendedAt(targetUserId);
    if (targetSuspendedAt) {
      return sendError(res, 409, "Cannot transfer admin role to a suspended user", "CONFLICT");
    }

    const transferred = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.id },
        data: { role: Role.STUDENT },
      });

      return tx.user.update({
        where: { id: targetUserId },
        data: { role: Role.ADMIN },
        select: { id: true, email: true, role: true, createdAt: true },
      });
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ADMIN_ROLE_TRANSFERRED",
      entityType: "User",
      entityId: targetUserId,
      metadata: {
        fromAdminId: actor.id,
        toAdminId: targetUserId,
        reason,
      },
      ip,
      userAgent,
    });

    return res.json({ ok: true, user: transferred });
  })
);

router.post(
  "/users/:id/reset-password",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const userId = assertNonEmptyString(req.params.id, "User id is required");

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!target) {
      return sendError(res, 404, "User not found", "NOT_FOUND");
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "USER_PASSWORD_RESET_ISSUED",
      entityType: "User",
      entityId: userId,
      metadata: { expiresAt: expiresAt.toISOString() },
      ip,
      userAgent,
    });

    return res.json({
      ok: true,
      ...(RETURN_ADMIN_RESET_TOKEN ? { resetToken: rawToken } : {}),
    });
  })
);

router.delete(
  "/users/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const userId = assertNonEmptyString(req.params.id, "User id is required");

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!target) {
      return sendError(res, 404, "User not found", "NOT_FOUND");
    }

    if (target.role === Role.ADMIN) {
      return sendError(res, 409, "Cannot delete the active admin account", "CONFLICT");
    }

    await prisma.user.delete({ where: { id: userId } });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "USER_DELETED",
      entityType: "User",
      entityId: userId,
      metadata: { deletedUserId: userId },
      ip,
      userAgent,
    });

    return res.json({ ok: true, deletedId: userId });
  })
);

export default router;
