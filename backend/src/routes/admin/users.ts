import { Router } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { parsePositiveInt } from "./shared.js";

const router = Router();

router.get(
  "/users",
  asyncHandler(async (req: AuthRequest, res) => {
    const page = parsePositiveInt(req.query.page, 1, 1, 10000);
    const pageSize = parsePositiveInt(req.query.pageSize, 20, 1, 100);
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "";
    const searchRaw = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const offset = (page - 1) * pageSize;

    const clauses: Prisma.Sql[] = [];
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

    const whereSql = clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}` : Prisma.empty;

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
          role: "ADMIN";
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

export default router;
