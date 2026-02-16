import crypto from "crypto";
import { Router } from "express";
import type { Response } from "express";
import { DeletionRequestStatus, EnrollmentStatus, Prisma, Role } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth.js";
import { assertEnrollmentTransitionAllowed } from "../services/enrollmentLifecycle.js";
import { hardDeleteCourse } from "../services/instructorService.js";
import { writeAuditLog } from "../services/auditService.js";
import { HttpError, assertNonEmptyString, sendError } from "../utils/httpError.js";
import { getRequestMeta } from "../utils/requestMeta.js";

const router = Router();
const RETURN_ADMIN_RESET_TOKEN = process.env.ADMIN_RETURN_RESET_TOKEN === "true";

type AuditDelegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  count: (args?: unknown) => Promise<number>;
};

function getAuditDelegate(): AuditDelegate | null {
  const delegate = (prisma as unknown as { auditLog?: AuditDelegate }).auditLog;
  return delegate ?? null;
}

async function getUserSuspendedAt(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ suspendedAt: Date | null }>>`
    SELECT "suspendedAt"
    FROM "User"
    WHERE "id" = ${userId}
    LIMIT 1
  `;
  return rows[0]?.suspendedAt ?? null;
}

async function setUserSuspendedAt(userId: string, suspendedAt: Date | null) {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "suspendedAt" = ${suspendedAt}
    WHERE "id" = ${userId}
  `;
}

function getActor(req: AuthRequest) {
  if (!req.user) {
    throw new HttpError(401, "Unauthorized");
  }
  return req.user;
}

function parsePositiveInt(value: unknown, fallback: number, min: number, max: number) {
  const num = typeof value === "string" && value.trim() ? Number(value) : fallback;
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new HttpError(400, `Value must be an integer between ${min} and ${max}`);
  }
  return num;
}

function normalizeOptionalText(value: unknown, maxLength: number) {
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

router.use(requireAuth, requireRole([Role.ADMIN]));

router.get(
  "/summary",
  asyncHandler(async (_req: AuthRequest, res) => {
    const auditDelegate = getAuditDelegate();
    const [totalUsers, totalCourses, totalEnrollments] = await prisma.$transaction([
      prisma.user.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
    ]);
    const recentAuditLogs = auditDelegate
      ? await auditDelegate.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : [];

    return res.json({
      totals: {
        users: totalUsers,
        courses: totalCourses,
        enrollments: totalEnrollments,
      },
      recentAuditLogs,
    });
  })
);

router.get(
  "/metrics",
  asyncHandler(async (_req: AuthRequest, res) => {
    const [
      totalUsers,
      totalInstructors,
      totalCourses,
      publishedCourses,
      unpublishedCourses,
      archivedCourses,
      totalEnrollments,
      pendingEnrollmentRequests,
      activeEnrollments,
      pendingDeletionRequests,
      suspendedUsersRows,
      suspendedInstructorsRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: Role.INSTRUCTOR } }),
      prisma.course.count(),
      prisma.course.count({ where: { isPublished: true, archivedAt: null } }),
      prisma.course.count({ where: { isPublished: false, archivedAt: null } }),
      prisma.course.count({ where: { archivedAt: { not: null } } }),
      prisma.enrollment.count(),
      prisma.enrollment.count({ where: { status: EnrollmentStatus.REQUESTED } }),
      prisma.enrollment.count({ where: { status: EnrollmentStatus.ACTIVE } }),
      prisma.deletionRequest.count({ where: { status: DeletionRequestStatus.PENDING } }),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "User" u
        WHERE u."suspendedAt" IS NOT NULL
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "User" u
        WHERE u."role" = 'INSTRUCTOR' AND u."suspendedAt" IS NOT NULL
      `),
    ]);

    return res.json({
      users: {
        total: totalUsers,
        suspended: Number(suspendedUsersRows[0]?.count ?? 0n),
      },
      instructors: {
        total: totalInstructors,
        suspended: Number(suspendedInstructorsRows[0]?.count ?? 0n),
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        unpublished: unpublishedCourses,
        archived: archivedCourses,
      },
      enrollments: {
        total: totalEnrollments,
        pendingRequests: pendingEnrollmentRequests,
        active: activeEnrollments,
      },
      deletionRequests: {
        pending: pendingDeletionRequests,
      },
    });
  })
);

router.get(
  "/instructors",
  asyncHandler(async (req: AuthRequest, res) => {
    const page = parsePositiveInt(req.query.page, 1, 1, 10000);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 1, 100);
    const searchRaw = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "";

    const clauses: Prisma.Sql[] = [Prisma.sql`u."role" = 'INSTRUCTOR'`];
    if (statusRaw === "active") {
      clauses.push(Prisma.sql`u."suspendedAt" IS NULL`);
    } else if (statusRaw === "suspended") {
      clauses.push(Prisma.sql`u."suspendedAt" IS NOT NULL`);
    }
    if (searchRaw) {
      const searchLike = `%${searchRaw}%`;
      clauses.push(
        Prisma.sql`(u."email" ILIKE ${searchLike} OR COALESCE(u."fullName", '') ILIKE ${searchLike})`
      );
    }

    const whereSql = Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
    const offset = (page - 1) * pageSize;

    const [countRows, instructors] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM "User" u
        ${whereSql}
      `),
      prisma.$queryRaw<
        Array<{
          id: string;
          email: string;
          fullName: string | null;
          createdAt: Date;
          suspendedAt: Date | null;
          totalCourses: number;
          publishedCourses: number;
          totalStudents: number;
        }>
      >(Prisma.sql`
        SELECT
          u."id",
          u."email",
          u."fullName",
          u."createdAt",
          u."suspendedAt",
          COUNT(DISTINCT c."id")::int AS "totalCourses",
          COUNT(DISTINCT CASE WHEN c."isPublished" = true AND c."archivedAt" IS NULL THEN c."id" END)::int AS "publishedCourses",
          COUNT(DISTINCT CASE WHEN e."status" = 'ACTIVE' THEN e."userId" END)::int AS "totalStudents"
        FROM "User" u
        LEFT JOIN "Course" c ON c."createdById" = u."id"
        LEFT JOIN "Enrollment" e ON e."courseId" = c."id"
        ${whereSql}
        GROUP BY u."id"
        ORDER BY u."createdAt" DESC
        OFFSET ${offset}
        LIMIT ${pageSize}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0n);

    return res.json({
      instructors,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  })
);

router.get(
  "/instructors/:id",
  asyncHandler(async (req: AuthRequest, res) => {
    const instructorId = assertNonEmptyString(req.params.id, "Instructor id is required");

    const instructor = await prisma.user.findFirst({
      where: { id: instructorId, role: Role.INSTRUCTOR },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        createdAt: true,
      },
    });

    if (!instructor) {
      return sendError(res, 404, "Instructor not found", "NOT_FOUND");
    }

    const [suspendedRows, countsRows] = await Promise.all([
      prisma.$queryRaw<Array<{ suspendedAt: Date | null }>>(Prisma.sql`
        SELECT "suspendedAt"
        FROM "User"
        WHERE "id" = ${instructorId}
        LIMIT 1
      `),
      prisma.$queryRaw<
        Array<{
          totalCourses: number;
          publishedCourses: number;
          unpublishedCourses: number;
          archivedCourses: number;
          totalStudents: number;
        }>
      >(Prisma.sql`
        SELECT
          COUNT(DISTINCT c."id")::int AS "totalCourses",
          COUNT(DISTINCT CASE WHEN c."isPublished" = true AND c."archivedAt" IS NULL THEN c."id" END)::int AS "publishedCourses",
          COUNT(DISTINCT CASE WHEN c."isPublished" = false AND c."archivedAt" IS NULL THEN c."id" END)::int AS "unpublishedCourses",
          COUNT(DISTINCT CASE WHEN c."archivedAt" IS NOT NULL THEN c."id" END)::int AS "archivedCourses",
          COUNT(DISTINCT CASE WHEN e."status" = 'ACTIVE' THEN e."userId" END)::int AS "totalStudents"
        FROM "Course" c
        LEFT JOIN "Enrollment" e ON e."courseId" = c."id"
        WHERE c."createdById" = ${instructorId}
      `),
    ]);

    return res.json({
      instructor: {
        ...instructor,
        suspendedAt: suspendedRows[0]?.suspendedAt ?? null,
      },
      counts: countsRows[0] ?? {
        totalCourses: 0,
        publishedCourses: 0,
        unpublishedCourses: 0,
        archivedCourses: 0,
        totalStudents: 0,
      },
    });
  })
);

router.get(
  "/instructors/:id/courses",
  asyncHandler(async (req: AuthRequest, res) => {
    const instructorId = assertNonEmptyString(req.params.id, "Instructor id is required");
    const page = parsePositiveInt(req.query.page, 1, 1, 10000);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 1, 100);
    const searchRaw = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "";

    const where = {
      createdById: instructorId,
      ...(statusRaw === "published" ? { isPublished: true, archivedAt: null } : {}),
      ...(statusRaw === "unpublished" ? { isPublished: false, archivedAt: null } : {}),
      ...(statusRaw === "archived" ? { archivedAt: { not: null } } : {}),
      ...(searchRaw ? { title: { contains: searchRaw, mode: "insensitive" as const } } : {}),
    };

    const [total, courses] = await prisma.$transaction([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              lessons: true,
              enrollments: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      courses,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  })
);

router.get(
  "/instructors/:id/students",
  asyncHandler(async (req: AuthRequest, res) => {
    const instructorId = assertNonEmptyString(req.params.id, "Instructor id is required");
    const page = parsePositiveInt(req.query.page, 1, 1, 10000);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 1, 100);
    const searchRaw = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const offset = (page - 1) * pageSize;

    const searchClause = searchRaw
      ? Prisma.sql`AND (u."email" ILIKE ${`%${searchRaw}%`} OR COALESCE(u."fullName", '') ILIKE ${`%${searchRaw}%`})`
      : Prisma.empty;

    const [countRows, students] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM (
          SELECT u."id"
          FROM "Enrollment" e
          JOIN "Course" c ON c."id" = e."courseId"
          JOIN "User" u ON u."id" = e."userId"
          WHERE c."createdById" = ${instructorId}
            AND e."status" = 'ACTIVE'
            ${searchClause}
          GROUP BY u."id"
        ) s
      `),
      prisma.$queryRaw<
        Array<{
          id: string;
          email: string;
          fullName: string | null;
          firstEnrolledAt: Date;
          activeCourses: number;
        }>
      >(Prisma.sql`
        SELECT
          u."id",
          u."email",
          u."fullName",
          MIN(e."createdAt") AS "firstEnrolledAt",
          COUNT(DISTINCT e."courseId")::int AS "activeCourses"
        FROM "Enrollment" e
        JOIN "Course" c ON c."id" = e."courseId"
        JOIN "User" u ON u."id" = e."userId"
        WHERE c."createdById" = ${instructorId}
          AND e."status" = 'ACTIVE'
          ${searchClause}
        GROUP BY u."id"
        ORDER BY MIN(e."createdAt") DESC
        OFFSET ${offset}
        LIMIT ${pageSize}
      `),
    ]);

    const total = Number(countRows[0]?.count ?? 0n);

    return res.json({
      students,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  })
);

router.get(
  "/users",
  asyncHandler(async (req: AuthRequest, res) => {
    const page = parsePositiveInt(req.query.page, 1, 1, 10000);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 1, 100);
    const roleRaw = typeof req.query.role === "string" ? req.query.role.trim().toUpperCase() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "";
    const searchRaw = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const roleFilter = roleRaw === "ADMIN" || roleRaw === "INSTRUCTOR" || roleRaw === "STUDENT" ? roleRaw : null;
    const clauses: Prisma.Sql[] = [];
    if (roleFilter) {
      clauses.push(Prisma.sql`u."role" = ${roleFilter as Role}`);
    }
    if (statusRaw === "active") {
      clauses.push(Prisma.sql`u."suspendedAt" IS NULL`);
    } else if (statusRaw === "suspended") {
      clauses.push(Prisma.sql`u."suspendedAt" IS NOT NULL`);
    }
    if (searchRaw) {
      const searchLike = `%${searchRaw}%`;
      clauses.push(
        Prisma.sql`(u."email" ILIKE ${searchLike} OR COALESCE(u."fullName", '') ILIKE ${searchLike})`
      );
    }

    const whereSql = clauses.length
      ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`
      : Prisma.empty;
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
        data: { role: Role.INSTRUCTOR },
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

router.get(
  "/courses",
  asyncHandler(async (req: AuthRequest, res) => {
    const page = parsePositiveInt(req.query.page, 1, 1, 10000);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 1, 100);
    const state = typeof req.query.state === "string" ? req.query.state.trim().toLowerCase() : "";
    const searchRaw = typeof req.query.search === "string" ? req.query.search.trim() : "";

    const where = {
      ...(state === "published" ? { isPublished: true, archivedAt: null } : {}),
      ...(state === "unpublished" ? { isPublished: false, archivedAt: null } : {}),
      ...(state === "archived" ? { archivedAt: { not: null } } : {}),
      ...(state === "active" ? { archivedAt: null } : {}),
      ...(state === "pending" ? { deletionRequests: { some: { status: DeletionRequestStatus.PENDING } } } : {}),
      ...(searchRaw ? { title: { contains: searchRaw, mode: "insensitive" as const } } : {}),
    };

    const [total, courses] = await prisma.$transaction([
      prisma.course.count({ where }),
      prisma.course.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdBy: { select: { id: true, email: true, fullName: true } },
          _count: {
            select: {
              lessons: true,
              enrollments: true,
              deletionRequests: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      courses,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  })
);

router.patch(
  "/courses/:id/publish",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const reason = normalizeOptionalText(req.body?.reason, 1000);

    const course = await prisma.course.update({
      where: { id: courseId },
      data: { isPublished: true },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "COURSE_PUBLISHED",
      entityType: "Course",
      entityId: courseId,
      metadata: { reason, override: true },
      ip,
      userAgent,
    });

    return res.json({ course });
  })
);

router.patch(
  "/courses/:id/unpublish",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const reason = normalizeOptionalText(req.body?.reason, 1000);

    const course = await prisma.course.update({
      where: { id: courseId },
      data: { isPublished: false },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "COURSE_UNPUBLISHED",
      entityType: "Course",
      entityId: courseId,
      metadata: { reason, override: true },
      ip,
      userAgent,
    });

    return res.json({ course });
  })
);

router.patch(
  "/courses/:id/archive",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const reason = normalizeOptionalText(req.body?.reason, 1000);
    const now = new Date();

    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        archivedAt: now,
        isPublished: false,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "COURSE_ARCHIVED",
      entityType: "Course",
      entityId: courseId,
      metadata: { reason, forced: true },
      ip,
      userAgent,
    });

    return res.json({ course });
  })
);

router.get(
  "/delete-requests",
  asyncHandler(async (req: AuthRequest, res) => {
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const status = ["PENDING", "APPROVED", "REJECTED"].includes(statusRaw)
      ? (statusRaw as DeletionRequestStatus)
      : null;

    const requests = await prisma.deletionRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        status: true,
        adminNote: true,
        createdAt: true,
        decidedAt: true,
        course: {
          select: { id: true, title: true, archivedAt: true, createdById: true },
        },
        requestedBy: {
          select: { id: true, email: true, fullName: true },
        },
        decidedBy: {
          select: { id: true, email: true, fullName: true },
        },
      },
    });
    return res.json({ requests });
  })
);

router.post(
  "/delete-requests/:id/approve",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const requestId = assertNonEmptyString(req.params.id, "Request id is required");

    const request = await prisma.deletionRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, courseId: true },
    });
    if (!request) {
      return sendError(res, 404, "Deletion request not found", "NOT_FOUND");
    }
    if (request.status !== DeletionRequestStatus.PENDING) {
      return sendError(res, 409, "Deletion request already decided", "CONFLICT");
    }

    const adminNote = normalizeOptionalText(req.body?.adminNote, 1000);
    const now = new Date();
    await prisma.$transaction([
      prisma.course.update({
        where: { id: request.courseId },
        data: {
          archivedAt: now,
          isPublished: false,
        },
      }),
      prisma.deletionRequest.update({
        where: { id: request.id },
        data: {
          status: DeletionRequestStatus.APPROVED,
          adminNote,
          decidedAt: now,
          decidedById: actor.id,
        },
      }),
    ]);

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "COURSE_ARCHIVED",
      entityType: "Course",
      entityId: request.courseId,
      metadata: {
        requestId: request.id,
        decision: "APPROVED",
        adminNoteLength: adminNote?.length ?? 0,
      },
      ip,
      userAgent,
    });

    return res.json({ ok: true, archivedCourseId: request.courseId });
  })
);

router.post(
  "/delete-requests/:id/reject",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const requestId = assertNonEmptyString(req.params.id, "Request id is required");
    const adminNote = normalizeOptionalText(req.body?.adminNote, 1000);

    if (!adminNote) {
      return sendError(res, 400, "adminNote is required when rejecting a deletion request", "VALIDATION_ERROR");
    }

    const request = await prisma.deletionRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true },
    });

    if (!request) {
      return sendError(res, 404, "Deletion request not found", "NOT_FOUND");
    }

    if (request.status !== DeletionRequestStatus.PENDING) {
      return sendError(res, 409, "Deletion request already decided", "CONFLICT");
    }

    const now = new Date();
    await prisma.deletionRequest.update({
      where: { id: request.id },
      data: {
        status: DeletionRequestStatus.REJECTED,
        adminNote,
        decidedAt: now,
        decidedById: actor.id,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "COURSE_DELETE_REJECTED",
      entityType: "DeletionRequest",
      entityId: request.id,
      metadata: {
        requestId: request.id,
        decision: "REJECTED",
        adminNoteLength: adminNote.length,
      },
      ip,
      userAgent,
    });

    return res.json({ ok: true, rejectedId: request.id });
  })
);

router.delete(
  "/courses/:id/hard-delete",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const courseId = assertNonEmptyString(req.params.id, "Course id is required");
    const result = await hardDeleteCourse(courseId);

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "COURSE_HARD_DELETED",
      entityType: "Course",
      entityId: result.deletedId,
      metadata: { deletedId: result.deletedId },
      ip,
      userAgent,
    });

    return res.json({ ok: true, deletedId: result.deletedId });
  })
);

router.get(
  "/enrollments",
  asyncHandler(async (req: AuthRequest, res) => {
    const page = parsePositiveInt(req.query.page, 1, 1, 10000);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 1, 100);
    const courseId = typeof req.query.courseId === "string" && req.query.courseId.trim() ? req.query.courseId : null;
    const userId = typeof req.query.userId === "string" && req.query.userId.trim() ? req.query.userId : null;
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";

    const status = ["REQUESTED", "ACTIVE", "REVOKED"].includes(statusRaw)
      ? (statusRaw as EnrollmentStatus)
      : null;

    const where = {
      ...(courseId ? { courseId } : {}),
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    };

    const [total, enrollments] = await prisma.$transaction([
      prisma.enrollment.count({ where }),
      prisma.enrollment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
              archivedAt: true,
            },
          },
        },
      }),
    ]);

    return res.json({
      enrollments,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  })
);

router.patch(
  "/enrollments/:id/status",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const enrollmentId = assertNonEmptyString(req.params.id, "Enrollment id is required");
    const statusRaw = typeof req.body?.status === "string" ? req.body.status.trim().toUpperCase() : "";
    const reason = normalizeOptionalText(req.body?.reason, 1000);

    if (!statusRaw || !["ACTIVE", "REVOKED"].includes(statusRaw)) {
      return sendError(res, 400, "Status must be ACTIVE or REVOKED", "VALIDATION_ERROR");
    }

    const nextStatus = statusRaw as "ACTIVE" | "REVOKED";

    const current = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        courseId: true,
        userId: true,
        status: true,
      },
    });

    if (!current) {
      return sendError(res, 404, "Enrollment request not found", "NOT_FOUND");
    }

    assertEnrollmentTransitionAllowed(current.status, nextStatus);

    const enrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: nextStatus },
      select: {
        id: true,
        courseId: true,
        userId: true,
        status: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: nextStatus === "ACTIVE" ? "ENROLLMENT_APPROVED" : "ENROLLMENT_REVOKED",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: {
        courseId: enrollment.courseId,
        studentId: enrollment.userId,
        status: enrollment.status,
        source: "admin_status_update",
        reason,
      },
      ip,
      userAgent,
    });

    return res.json({ ok: true, enrollment });
  })
);

router.post(
  "/enrollments/grant",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const userId = assertNonEmptyString(req.body?.userId, "userId is required");
    const courseId = assertNonEmptyString(req.body?.courseId, "courseId is required");
    const reason = normalizeOptionalText(req.body?.reason, 1000);

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    let enrollment;
    if (!existing) {
      enrollment = await prisma.enrollment.create({
        data: {
          userId,
          courseId,
          status: EnrollmentStatus.ACTIVE,
        },
      });
    } else {
      assertEnrollmentTransitionAllowed(existing.status, "ACTIVE");
      enrollment = await prisma.enrollment.update({
        where: { id: existing.id },
        data: { status: EnrollmentStatus.ACTIVE },
      });
    }

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ENROLLMENT_GRANTED",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: {
        courseId,
        studentId: userId,
        status: enrollment.status,
        reason,
      },
      ip,
      userAgent,
    });

    return res.status(existing ? 200 : 201).json({ ok: true, enrollment });
  })
);

router.post(
  "/enrollments/revoke",
  asyncHandler(async (req: AuthRequest, res) => {
    const actor = getActor(req);
    const { ip, userAgent } = getRequestMeta(req);
    const userId = assertNonEmptyString(req.body?.userId, "userId is required");
    const courseId = assertNonEmptyString(req.body?.courseId, "courseId is required");
    const reason = normalizeOptionalText(req.body?.reason, 1000);

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) {
      return sendError(res, 404, "Enrollment request not found", "NOT_FOUND");
    }

    assertEnrollmentTransitionAllowed(existing.status, "REVOKED");

    const enrollment = await prisma.enrollment.update({
      where: { id: existing.id },
      data: { status: EnrollmentStatus.REVOKED },
    });

    await writeAuditLog({
      actorId: actor.id,
      actorRole: actor.role,
      action: "ENROLLMENT_REVOKED",
      entityType: "Enrollment",
      entityId: enrollment.id,
      metadata: {
        courseId,
        studentId: userId,
        status: enrollment.status,
        source: "admin_direct_revoke",
        reason,
      },
      ip,
      userAgent,
    });

    return res.json({ ok: true, enrollment });
  })
);

router.get(
  "/audit-logs",
  asyncHandler(async (req: AuthRequest, res) => {
    const auditDelegate = getAuditDelegate();
    if (!auditDelegate) {
      return res.json({ logs: [], page: 1, pageSize: 20, total: 0, totalPages: 1 });
    }

    const page = parsePositiveInt(req.query.page, 1, 1, 10000);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 1, 100);
    const actorId = typeof req.query.actorId === "string" && req.query.actorId.trim() ? req.query.actorId : null;
    const action = typeof req.query.action === "string" && req.query.action.trim() ? req.query.action.trim() : null;
    const entityType =
      typeof req.query.entityType === "string" && req.query.entityType.trim() ? req.query.entityType.trim() : null;
    const dateFrom = typeof req.query.dateFrom === "string" && req.query.dateFrom.trim() ? new Date(req.query.dateFrom) : null;
    const dateTo = typeof req.query.dateTo === "string" && req.query.dateTo.trim() ? new Date(req.query.dateTo) : null;

    const createdAtFilter = {
      ...(dateFrom && !Number.isNaN(dateFrom.getTime()) ? { gte: dateFrom } : {}),
      ...(dateTo && !Number.isNaN(dateTo.getTime()) ? { lte: dateTo } : {}),
    };

    const where = {
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
    };

    const [total, logs] = await Promise.all([
      auditDelegate.count({ where }),
      auditDelegate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return res.json({
      logs,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
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

    if (target.role === Role.INSTRUCTOR) {
      const ownedCourses = await prisma.course.count({
        where: { createdById: userId },
      });
      if (ownedCourses > 0) {
        return sendError(res, 409, "Cannot delete instructor who still owns courses", "CONFLICT");
      }
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
