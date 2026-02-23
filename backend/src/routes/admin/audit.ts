import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import type { AuthRequest } from "../../middleware/auth.js";
import { getAuditDelegate, parsePositiveInt } from "./shared.js";

const router = Router();

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

export default router;
