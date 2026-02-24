import { Prisma } from "@prisma/client";
import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { createRateLimiter } from "../middleware/rateLimit.js";
import { HttpError } from "../utils/httpError.js";
import { validateEventName, validateMetadata, validateOptionalId } from "../validation/analyticsValidation.js";

const router = Router();
const IS_PROD = process.env.NODE_ENV === "production";
const OVERVIEW_CACHE_TTL_MS = 30_000;
const TRENDS_CACHE_TTL_MS = 60_000;
const analyticsResponseCache = new Map<string, { expiresAt: number; payload: unknown }>();
const analyticsLimiter = createRateLimiter({
  windowMs: Number(process.env.ANALYTICS_RATE_LIMIT_WINDOW_MS ?? 60 * 1000),
  max: Number(process.env.ANALYTICS_RATE_LIMIT_MAX ?? 240),
  message: "Too many analytics requests. Please try again shortly.",
});

type SupportedRange = "7d" | "30d";
type SupportedMetric = "revenue" | "orders" | "users";
type ProductDelegate = {
  create: (args: {
    data: { name: string; price: Prisma.Decimal; isActive: boolean };
    select: {
      id: true;
      name: true;
      price: true;
      isActive: true;
      createdAt: true;
    };
  }) => Promise<{ id: string; name: string; price: Prisma.Decimal; isActive: boolean; createdAt: Date }>;
  findUnique: (args: { where: { id: string }; select: { id: true } }) => Promise<{ id: string } | null>;
};
type OrderDelegate = {
  create: (args: {
    data: { productId: string; amount: Prisma.Decimal; status: string };
    select: {
      id: true;
      productId: true;
      amount: true;
      status: true;
      createdAt: true;
    };
  }) => Promise<{ id: string; productId: string; amount: Prisma.Decimal; status: string; createdAt: Date }>;
  findUnique: (args: { where: { id: string }; select: { id: true } }) => Promise<{ id: string } | null>;
};
type AnalyticsEventDelegate = {
  findMany: (args: {
    where: { createdAt: { gte: Date } };
    select: {
      id: true;
      eventName: true;
      userId: true;
      createdAt: true;
      productId: true;
      orderId: true;
    };
    orderBy: { createdAt: "desc" };
    take: number;
  }) => Promise<Array<{
    id: string;
    eventName: string;
    userId: string | null;
    createdAt: Date;
    productId: string | null;
    orderId: string | null;
  }>>;
  create: (args: {
    data: {
      eventName: string;
      productId: string | null;
      orderId: string | null;
      userId: string | null;
      metadata?: Prisma.InputJsonValue;
    };
    select: {
      id: true;
      eventName: true;
      productId: true;
      orderId: true;
      userId: true;
      createdAt: true;
    };
  }) => Promise<{
    id: string;
    eventName: string;
    productId: string | null;
    orderId: string | null;
    userId: string | null;
    createdAt: Date;
  }>;
};

function getAnalyticsDelegates() {
  const client = prisma as unknown as {
    product?: ProductDelegate;
    order?: OrderDelegate;
    analyticsEvent?: AnalyticsEventDelegate;
  };
  if (!client.product || !client.order || !client.analyticsEvent) {
    throw new HttpError(500, "Prisma client is missing analytics delegates. Run `npx prisma generate`.");
  }
  return {
    product: client.product,
    order: client.order,
    analyticsEvent: client.analyticsEvent,
  };
}

function parseRange(value: unknown): SupportedRange {
  if (value === undefined) return "7d";
  if (value === "7d" || value === "30d") return value;
  throw new HttpError(400, "range must be one of: 7d, 30d");
}

function parseMetric(value: unknown): SupportedMetric {
  if (value === "revenue" || value === "orders" || value === "users") return value;
  throw new HttpError(400, "metric must be one of: revenue, orders, users");
}

function rangeStart(range: SupportedRange) {
  const now = new Date();
  const days = range === "30d" ? 30 : 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

function toDayLabel(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayLabels(start: Date, end: Date) {
  const labels: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    labels.push(toDayLabel(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return labels;
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) return 0;
  return value instanceof Prisma.Decimal ? value.toNumber() : Number(value);
}

function roundTo(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function nowMs() {
  return Date.now();
}

function logSlowDbQuery(routeName: string, durationMs: number) {
  if (IS_PROD || durationMs <= 200) return;
  console.log(`[analytics][slow-query] ${routeName} ${Math.round(durationMs)}ms`);
}

function getCachedPayload<T>(key: string): T | null {
  const hit = analyticsResponseCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= nowMs()) {
    analyticsResponseCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

function setCachedPayload(key: string, payload: unknown, ttlMs: number) {
  analyticsResponseCache.set(key, {
    payload,
    expiresAt: nowMs() + ttlMs,
  });
}

function escapeLikeSearch(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function assertNoUnknownFields(payload: Record<string, unknown>, allowed: string[]) {
  const unknown = Object.keys(payload).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw new HttpError(400, `Unknown field(s): ${unknown.join(", ")}`);
  }
}

function parsePositiveDecimal(value: unknown, fieldName: string) {
  const numeric = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new HttpError(400, `${fieldName} must be a positive number`);
  }
  return numeric;
}

type ActivityCursorPayload = {
  createdAt: string;
  id: string;
};

function encodeActivityCursor(payload: ActivityCursorPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function decodeActivityCursor(raw: string): { createdAt: Date; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as ActivityCursorPayload;
    if (!parsed || typeof parsed.createdAt !== "string" || typeof parsed.id !== "string" || !parsed.id.trim()) {
      throw new Error("Invalid cursor payload");
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error("Invalid cursor timestamp");
    }
    return { createdAt, id: parsed.id.trim() };
  } catch {
    throw new HttpError(400, "Invalid cursor");
  }
}

router.use("/analytics", analyticsLimiter);

router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 25;
    const limit = Number.isInteger(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 25;
    const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const q = qRaw.slice(0, 80);
    const cursorId = typeof req.query.cursor === "string" ? req.query.cursor.trim() : "";

    let cursorFilter: Prisma.ProductWhereInput | undefined;
    if (cursorId) {
      const cursorRow = await prisma.product.findUnique({
        where: { id: cursorId },
        select: { id: true, createdAt: true },
      });
      if (!cursorRow) {
        throw new HttpError(400, "Invalid cursor");
      }
      cursorFilter = {
        OR: [
          { createdAt: { lt: cursorRow.createdAt } },
          {
            AND: [{ createdAt: cursorRow.createdAt }, { id: { lt: cursorRow.id } }],
          },
        ],
      };
    }

    const searchFilter: Prisma.ProductWhereInput | undefined = q
      ? {
          OR: [{ name: { contains: q, mode: "insensitive" } }, { id: { contains: q } }],
        }
      : undefined;

    const andFilters: Prisma.ProductWhereInput[] = [];
    if (searchFilter) andFilters.push(searchFilter);
    if (cursorFilter) andFilters.push(cursorFilter);
    const where: Prisma.ProductWhereInput = andFilters.length ? { AND: andFilters } : {};

    const dbStart = nowMs();
    const rows = await prisma.product.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            events: true,
          },
        },
      },
    });
    logSlowDbQuery("GET /admin/products", nowMs() - dbStart);

    let nextCursor: string | null = null;
    let products = rows;
    if (rows.length > limit) {
      const cursorSource = rows[limit];
      products = rows.slice(0, limit);
      nextCursor = cursorSource.id;
    }

    return res.json({ products, nextCursor });
  })
);

router.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 25;
    const limit = Number.isInteger(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 25;
    const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const q = qRaw.slice(0, 80);
    const cursorId = typeof req.query.cursor === "string" ? req.query.cursor.trim() : "";

    let cursorFilter: Prisma.OrderWhereInput | undefined;
    if (cursorId) {
      const cursorRow = await prisma.order.findUnique({
        where: { id: cursorId },
        select: { id: true, createdAt: true },
      });
      if (!cursorRow) {
        throw new HttpError(400, "Invalid cursor");
      }
      cursorFilter = {
        OR: [
          { createdAt: { lt: cursorRow.createdAt } },
          {
            AND: [{ createdAt: cursorRow.createdAt }, { id: { lt: cursorRow.id } }],
          },
        ],
      };
    }

    const searchFilter: Prisma.OrderWhereInput | undefined = q
      ? {
          OR: [
            { id: { contains: q } },
            { productId: { contains: q } },
            { product: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined;

    const andFilters: Prisma.OrderWhereInput[] = [];
    if (searchFilter) andFilters.push(searchFilter);
    if (cursorFilter) andFilters.push(cursorFilter);
    const where: Prisma.OrderWhereInput = andFilters.length ? { AND: andFilters } : {};

    const dbStart = nowMs();
    const rows = await prisma.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      select: {
        id: true,
        createdAt: true,
        amount: true,
        status: true,
        productId: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            events: true,
          },
        },
      },
    });
    logSlowDbQuery("GET /admin/orders", nowMs() - dbStart);

    let nextCursor: string | null = null;
    let orders = rows;
    if (rows.length > limit) {
      const cursorSource = rows[limit];
      orders = rows.slice(0, limit);
      nextCursor = cursorSource.id;
    }

    return res.json({
      orders: orders.map((order) => ({
        ...order,
        amount: order.amount.toNumber(),
      })),
      nextCursor,
    });
  })
);

router.get(
  "/analytics/overview",
  asyncHandler(async (req, res) => {
    const range = parseRange(req.query.range);
    const cacheKey = `overview:${range}`;
    const cached = getCachedPayload<{
      revenue: number;
      orders: number;
      activeUsers: number;
      conversionRate: number;
      prior: {
        revenue: number;
        orders: number;
        activeUsers: number;
        conversionRate: number;
      };
      deltas: {
        revenueDeltaPct: number;
        ordersDeltaPct: number;
        activeUsersDeltaPct: number;
        conversionDeltaPts: number;
      };
    }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const now = new Date();
    const durationMs = (range === "30d" ? 30 : 7) * 24 * 60 * 60 * 1000;
    const currentEnd = now;
    const currentStart = new Date(now.getTime() - durationMs);
    const priorEnd = currentStart;
    const priorStart = new Date(currentStart.getTime() - durationMs);

    async function aggregateOverviewWindow(start: Date, end: Date) {
      const [revenueRows, ordersRows, activeUserRows] = await Promise.all([
        prisma.$queryRaw<Array<{ total: Prisma.Decimal | null }>>(Prisma.sql`
          SELECT COALESCE(SUM(o."amount"), 0)::numeric AS total
          FROM "Order" o
          WHERE o."status" = 'completed'
            AND o."createdAt" >= ${start}
            AND o."createdAt" < ${end}
        `),
        prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
          SELECT COUNT(*)::bigint AS total
          FROM "Order" o
          WHERE o."createdAt" >= ${start}
            AND o."createdAt" < ${end}
        `),
        prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
          SELECT COUNT(DISTINCT ae."userId")::bigint AS total
          FROM "AnalyticsEvent" ae
          WHERE ae."eventName" = 'page_view'
            AND ae."userId" IS NOT NULL
            AND ae."createdAt" >= ${start}
            AND ae."createdAt" < ${end}
        `),
      ]);

      const revenue = decimalToNumber(revenueRows[0]?.total);
      const orders = Number(ordersRows[0]?.total ?? 0n);
      const activeUsers = Number(activeUserRows[0]?.total ?? 0n);
      const conversionRate = activeUsers > 0 ? orders / activeUsers : 0;
      return { revenue, orders, activeUsers, conversionRate };
    }

    const dbStart = nowMs();
    const [current, prior] = await Promise.all([
      aggregateOverviewWindow(currentStart, currentEnd),
      aggregateOverviewWindow(priorStart, priorEnd),
    ]);
    logSlowDbQuery("GET /admin/analytics/overview", nowMs() - dbStart);

    const revenueDeltaPct = prior.revenue === 0 ? 0 : ((current.revenue - prior.revenue) / prior.revenue) * 100;
    const ordersDeltaPct = prior.orders === 0 ? 0 : ((current.orders - prior.orders) / prior.orders) * 100;
    const activeUsersDeltaPct =
      prior.activeUsers === 0 ? 0 : ((current.activeUsers - prior.activeUsers) / prior.activeUsers) * 100;
    const conversionDeltaPts = (current.conversionRate - prior.conversionRate) * 100;

    const payload = {
      revenue: current.revenue,
      orders: current.orders,
      activeUsers: current.activeUsers,
      conversionRate: current.conversionRate,
      prior: {
        revenue: prior.revenue,
        orders: prior.orders,
        activeUsers: prior.activeUsers,
        conversionRate: prior.conversionRate,
      },
      deltas: {
        revenueDeltaPct: roundTo(revenueDeltaPct, 2),
        ordersDeltaPct: roundTo(ordersDeltaPct, 2),
        activeUsersDeltaPct: roundTo(activeUsersDeltaPct, 2),
        conversionDeltaPts: roundTo(conversionDeltaPts, 2),
      },
    };

    setCachedPayload(cacheKey, payload, OVERVIEW_CACHE_TTL_MS);
    return res.json(payload);
  })
);

router.get(
  "/analytics/trends",
  asyncHandler(async (req, res) => {
    const range = parseRange(req.query.range);
    const metric = parseMetric(req.query.metric);
    const cacheKey = `trends:${metric}:${range}`;
    const cached = getCachedPayload<{ labels: string[]; data: number[] }>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const start = rangeStart(range);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let rows: Array<{ day: Date; value: Prisma.Decimal | bigint }> = [];
    const dbStart = nowMs();

    if (metric === "revenue") {
      rows = await prisma.$queryRaw<Array<{ day: Date; value: Prisma.Decimal }>>(Prisma.sql`
        SELECT DATE_TRUNC('day', o."createdAt")::date AS day, COALESCE(SUM(o."amount"), 0)::numeric AS value
        FROM "Order" o
        WHERE o."status" = 'completed'
          AND o."createdAt" >= ${start}
        GROUP BY day
        ORDER BY day ASC
      `);
    } else if (metric === "orders") {
      rows = await prisma.$queryRaw<Array<{ day: Date; value: bigint }>>(Prisma.sql`
        SELECT DATE_TRUNC('day', o."createdAt")::date AS day, COUNT(*)::bigint AS value
        FROM "Order" o
        WHERE o."createdAt" >= ${start}
        GROUP BY day
        ORDER BY day ASC
      `);
    } else {
      rows = await prisma.$queryRaw<Array<{ day: Date; value: bigint }>>(Prisma.sql`
        SELECT DATE_TRUNC('day', ae."createdAt")::date AS day, COUNT(DISTINCT ae."userId")::bigint AS value
        FROM "AnalyticsEvent" ae
        WHERE ae."userId" IS NOT NULL
          AND ae."createdAt" >= ${start}
        GROUP BY day
        ORDER BY day ASC
      `);
    }
    logSlowDbQuery("GET /admin/analytics/trends", nowMs() - dbStart);

    const labels = dayLabels(start, today);
    const valueByDay = new Map<string, number>();
    for (const row of rows) {
      const key = toDayLabel(row.day);
      if (metric === "revenue") {
        valueByDay.set(key, decimalToNumber(row.value as Prisma.Decimal));
      } else {
        valueByDay.set(key, Number(row.value));
      }
    }

    const data = labels.map((label) => valueByDay.get(label) ?? 0);
    const payload = { labels, data };
    setCachedPayload(cacheKey, payload, TRENDS_CACHE_TTL_MS);
    return res.json(payload);
  })
);

router.get(
  "/analytics/activity",
  asyncHandler(async (req, res) => {
    const range = parseRange(req.query.range);
    const start = rangeStart(range);
    const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 && limitRaw <= 200 ? limitRaw : 50;
    const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (qRaw.length > 80) {
      throw new HttpError(400, "q must be at most 80 characters");
    }
    const q = qRaw.replace(/\s+/g, " ").trim();
    const searchLike = `%${escapeLikeSearch(q)}%`;
    const cursorRaw = typeof req.query.cursor === "string" ? req.query.cursor.trim() : "";
    const cursor = cursorRaw ? decodeActivityCursor(cursorRaw) : null;

    const searchSql =
      q.length > 0
        ? q.length >= 3
          ? Prisma.sql`
              AND (
                ae."eventName" ILIKE ${searchLike} ESCAPE '\\'
                OR COALESCE(ae."userId", '') ILIKE ${searchLike} ESCAPE '\\'
                OR COALESCE(ae."metadata"::text, '') ILIKE ${searchLike} ESCAPE '\\'
              )
            `
          : Prisma.sql`
              AND (
                ae."eventName" ILIKE ${searchLike} ESCAPE '\\'
                OR COALESCE(ae."userId", '') ILIKE ${searchLike} ESCAPE '\\'
              )
            `
        : Prisma.empty;
    const cursorSql = cursor
      ? Prisma.sql`
          AND (
            ae."createdAt" < ${cursor.createdAt}
            OR (ae."createdAt" = ${cursor.createdAt} AND ae."id" < ${cursor.id})
          )
        `
      : Prisma.empty;

    const dbStart = nowMs();
    const events = await prisma.$queryRaw<Array<{
      id: string;
      eventName: string;
      userId: string | null;
      createdAt: Date;
      productId: string | null;
      orderId: string | null;
    }>>(Prisma.sql`
      SELECT
        ae."id",
        ae."eventName",
        ae."userId",
        ae."createdAt",
        ae."productId",
        ae."orderId"
      FROM "AnalyticsEvent" ae
      WHERE ae."createdAt" >= ${start}
      ${searchSql}
      ${cursorSql}
      ORDER BY ae."createdAt" DESC, ae."id" DESC
      LIMIT ${limit + 1}
    `);
    logSlowDbQuery("GET /admin/analytics/activity", nowMs() - dbStart);

    let nextCursor: string | null = null;
    let pageEvents = events;
    if (events.length > limit) {
      const cursorSource = events[limit];
      pageEvents = events.slice(0, limit);
      nextCursor = encodeActivityCursor({
        createdAt: cursorSource.createdAt.toISOString(),
        id: cursorSource.id,
      });
    }

    const userIds = [...new Set(pageEvents.map((event) => event.userId).filter((value): value is string => Boolean(value)))];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, fullName: true },
        })
      : [];
    const userLabelById = new Map<string, string>();
    for (const user of users) {
      const fullName = user.fullName?.trim();
      if (fullName) {
        userLabelById.set(user.id, fullName);
        continue;
      }
      if (user.email) {
        userLabelById.set(user.id, user.email);
      }
    }

    const enrichedEvents = pageEvents.map((event) => {
      if (!event.userId) {
        return { ...event, actorLabel: "System" };
      }
      const label = userLabelById.get(event.userId) ?? `Unknown (${event.userId.slice(-6)})`;
      return { ...event, actorLabel: label };
    });

    return res.json({ events: enrichedEvents, nextCursor });
  })
);

router.delete(
  "/products/:id",
  asyncHandler(async (req, res) => {
    const productId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!productId) {
      throw new HttpError(400, "product id is required");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });
    if (!product) {
      throw new HttpError(404, "product_not_found");
    }

    if (product.isActive) {
      await prisma.product.update({
        where: { id: productId },
        data: { isActive: false },
      });
    }

    return res.json({ ok: true });
  })
);

router.patch(
  "/orders/:id/status",
  asyncHandler(async (req, res) => {
    const orderId = typeof req.params.id === "string" ? req.params.id.trim() : "";
    const statusRaw = typeof req.body?.status === "string" ? req.body.status.trim().toLowerCase() : "";
    const allowedStatuses = ["completed", "pending", "refunded", "canceled"];

    if (!orderId) {
      throw new HttpError(400, "order id is required");
    }
    if (!allowedStatuses.includes(statusRaw)) {
      throw new HttpError(400, "status must be one of: completed, pending, refunded, canceled");
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });
    if (!existing) {
      throw new HttpError(404, "order_not_found");
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: statusRaw },
      select: {
        id: true,
        productId: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    return res.json({
      order: {
        ...order,
        amount: order.amount.toNumber(),
      },
    });
  })
);

router.post(
  "/products",
  asyncHandler(async (req, res) => {
    const { product: productDelegate } = getAnalyticsDelegates();
    assertNoUnknownFields((req.body ?? {}) as Record<string, unknown>, ["name", "price", "isActive"]);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const priceRaw = req.body?.price;
    const hasIsActive = Object.prototype.hasOwnProperty.call(req.body ?? {}, "isActive");
    const isActiveRaw = req.body?.isActive;
    const isActive = hasIsActive ? Boolean(isActiveRaw) : true;
    const priceNum = parsePositiveDecimal(priceRaw, "price");

    if (name.length < 2 || name.length > 80) {
      throw new HttpError(400, "name must be between 2 and 80 characters");
    }
    if (hasIsActive && typeof isActiveRaw !== "boolean") {
      throw new HttpError(400, "isActive must be a boolean");
    }

    const product = await productDelegate.create({
      data: {
        name,
        price: new Prisma.Decimal(priceNum),
        isActive,
      },
      select: {
        id: true,
        name: true,
        price: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      product: {
        ...product,
        price: product.price.toNumber(),
      },
    });
  })
);

router.post(
  "/orders",
  asyncHandler(async (req, res) => {
    const { product: productDelegate, order: orderDelegate } = getAnalyticsDelegates();
    assertNoUnknownFields((req.body ?? {}) as Record<string, unknown>, ["productId", "amount", "status"]);
    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : "";
    const status = typeof req.body?.status === "string" ? req.body.status.trim().toLowerCase() : "";
    const amountRaw = req.body?.amount;
    const amountNum = parsePositiveDecimal(amountRaw, "amount");

    if (!productId) {
      throw new HttpError(400, "productId is required");
    }
    if (!["completed", "refunded", "pending"].includes(status)) {
      throw new HttpError(400, "status must be one of: completed, refunded, pending");
    }

    const product = await productDelegate.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) {
      throw new HttpError(404, "product_not_found");
    }

    const order = await orderDelegate.create({
      data: {
        productId,
        amount: new Prisma.Decimal(amountNum),
        status,
      },
      select: {
        id: true,
        productId: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      order: {
        ...order,
        amount: order.amount.toNumber(),
      },
    });
  })
);

router.post(
  "/events",
  asyncHandler(async (req, res) => {
    const {
      product: productDelegate,
      order: orderDelegate,
      analyticsEvent,
    } = getAnalyticsDelegates();
    assertNoUnknownFields((req.body ?? {}) as Record<string, unknown>, [
      "eventName",
      "productId",
      "orderId",
      "userId",
      "metadata",
    ]);
    const eventName = validateEventName(req.body?.eventName);
    const productId = validateOptionalId(req.body?.productId, "productId");
    const orderId = validateOptionalId(req.body?.orderId, "orderId");
    const userId = validateOptionalId(req.body?.userId, "userId");
    const metadata = validateMetadata(req.body?.metadata);

    if (productId) {
      const product = await productDelegate.findUnique({ where: { id: productId }, select: { id: true } });
      if (!product) {
        throw new HttpError(404, "product_not_found");
      }
    }
    if (orderId) {
      const order = await orderDelegate.findUnique({ where: { id: orderId }, select: { id: true } });
      if (!order) {
        throw new HttpError(404, "order_not_found");
      }
    }

    const event = await analyticsEvent.create({
      data: {
        eventName,
        productId: productId || null,
        orderId: orderId || null,
        userId: userId || null,
        metadata: metadata === undefined ? undefined : (metadata as Prisma.InputJsonValue),
      },
      select: {
        id: true,
        eventName: true,
        productId: true,
        orderId: true,
        userId: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ event });
  })
);

/*
Manual validation checklist:
- POST /admin/products { "name": "A", "price": 5 } => 400 (name length)
- POST /admin/products { "name": "Starter", "price": 0 } => 400 (positive price required)
- POST /admin/orders { "productId": "x", "amount": 12, "status": "invalid" } => 400 (status enum)
- POST /admin/orders { "productId": "missing", "amount": 12, "status": "completed" } => 404 (product_not_found)
- POST /admin/events { "eventName": "bad space" } => 400 (eventName format)
- POST /admin/events { "eventName": "page_view", "metadata": [] } => 400 (metadata must be object)
- POST /admin/events { "eventName": "page_view", "orderId": "missing" } => 404 (order_not_found)
*/

export default router;
