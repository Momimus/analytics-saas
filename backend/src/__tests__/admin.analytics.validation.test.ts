import jwt from "jsonwebtoken";
import request from "supertest";
import { Prisma } from "@prisma/client";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_ORIGINS = "http://localhost:5173";

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  workspaceMember: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  product: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  order: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  analyticsEvent: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  workspaceSettings: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  auditLog: {
    count: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  passwordResetToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $queryRaw: vi.fn(),
};

vi.mock("../lib/prisma.js", () => ({
  default: prismaMock,
}));

const { app } = await import("../index.js");

function signAuthCookie(user: { id: string; role: "SUPER_ADMIN" | "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER" }) {
  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "1h" });
  return `auth_token=${token}`;
}

function buildWorkspaceCookies(
  user: { id: string; role: "SUPER_ADMIN" | "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER" },
  workspaceId = "ws-1"
) {
  return `${signAuthCookie(user)}; ws=${workspaceId}`;
}

describe("workspace-scoped admin analytics route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$queryRaw.mockResolvedValue([{ suspendedAt: null }]);
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.workspace.findUnique.mockResolvedValue({ id: "ws-1" });
    prismaMock.workspace.findFirst.mockResolvedValue({ id: "ws-1" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1" });
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.order.findUnique.mockResolvedValue(null);
  });

  it("rejects invalid workspace ids before loading products", async () => {
    const response = await request(app)
      .get("/admin/products")
      .set("Cookie", `${signAuthCookie({ id: "admin-1", role: "WORKSPACE_ADMIN" })}; ws=bad space`)
      .set("x-workspace-id", "bad space");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(prismaMock.product.findMany).not.toHaveBeenCalled();
  });

  it("returns an empty products response for a workspace admin", async () => {
    const response = await request(app)
      .get("/admin/products")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ products: [], nextCursor: null });
    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ workspaceId: "ws-1" }, { isActive: true }] },
        take: 26,
      })
    );
  });

  it("clamps invalid product limit values instead of crashing", async () => {
    await request(app)
      .get("/admin/products?limit=0")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 2,
      })
    );
  });

  it("rejects invalid product cursors", async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get("/admin/products?cursor=prod-missing")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid cursor");
  });

  it("returns an empty orders response for a workspace admin", async () => {
    const response = await request(app)
      .get("/admin/orders")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ orders: [], nextCursor: null });
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ workspaceId: "ws-1" }] },
        take: 26,
      })
    );
  });

  it("rejects invalid order cursors", async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: "order-1", workspaceId: "ws-other", createdAt: new Date("2026-03-13T00:00:00.000Z") });

    const response = await request(app)
      .get("/admin/orders?cursor=order-1")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid cursor");
  });

  it("rejects unsupported analytics overview ranges", async () => {
    const response = await request(app)
      .get("/admin/analytics/overview?range=90d")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("range must be one of: 7d, 30d");
  });

  it("rejects unsupported analytics trend metrics", async () => {
    const response = await request(app)
      .get("/admin/analytics/trends?range=7d&metric=bounce")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("metric must be one of: revenue, orders, users");
  });

  it("returns an empty activity response when no events exist", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ suspendedAt: null }])
      .mockResolvedValueOnce([]);

    const response = await request(app)
      .get("/admin/analytics/activity?range=7d")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ events: [], nextCursor: null });
  });

  it("rejects malformed activity cursors", async () => {
    const response = await request(app)
      .get("/admin/analytics/activity?range=7d&cursor=not-base64")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid cursor");
  });

  it("rejects overly long activity search queries", async () => {
    const query = "x".repeat(81);

    const response = await request(app)
      .get(`/admin/analytics/activity?range=7d&q=${query}`)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("q must be at most 80 characters");
  });

  it("falls back to the default activity limit for out-of-range values", async () => {
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ suspendedAt: null }])
      .mockResolvedValueOnce([]);

    await request(app)
      .get("/admin/analytics/activity?range=7d&limit=999")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    const activityQuery = prismaMock.$queryRaw.mock.calls[1]?.[0] as { values?: unknown[] };
    expect(activityQuery.values).toEqual(expect.arrayContaining([51]));
  });
});
