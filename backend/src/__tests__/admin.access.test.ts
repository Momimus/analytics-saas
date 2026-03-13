import jwt from "jsonwebtoken";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_ORIGINS = "http://localhost:5173";

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  workspace: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  workspaceMember: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
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

function buildWorkspaceCookies(user: {
  id: string;
  role: "SUPER_ADMIN" | "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER";
}, workspaceId = "ws-1") {
  return `${signAuthCookie(user)}; ws=${workspaceId}`;
}

describe("admin users and audit access paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$queryRaw.mockResolvedValue([{ suspendedAt: null }]);
    prismaMock.workspace.findUnique.mockResolvedValue({ id: "ws-1" });
    prismaMock.workspace.findFirst.mockResolvedValue({ id: "ws-1" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1" });
    prismaMock.auditLog.count.mockResolvedValue(1);
    prismaMock.auditLog.findMany.mockResolvedValue([
      {
        id: "log-1",
        workspaceId: "ws-1",
        actorId: "admin-1",
        actorRole: "WORKSPACE_ADMIN",
        action: "order.created",
        entityType: "order",
        entityId: "order-1",
        metadata: { amount: 42 },
        ip: "127.0.0.1",
        userAgent: "vitest",
        createdAt: new Date("2026-03-13T00:00:00.000Z"),
      },
    ]);
  });

  it("allows SUPER_ADMIN to access the users directory", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "super-1", role: "SUPER_ADMIN" });
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ suspendedAt: null }])
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([
        {
          id: "user-1",
          email: "owner@example.com",
          role: "SUPER_ADMIN",
          fullName: "Owner",
          createdAt: new Date("2026-03-13T00:00:00.000Z"),
          suspendedAt: null,
        },
      ]);

    const response = await request(app)
      .get("/admin/users")
      .set("Cookie", signAuthCookie({ id: "super-1", role: "SUPER_ADMIN" }));

    expect(response.status).toBe(200);
    expect(response.body.users).toHaveLength(1);
    expect(response.body.users[0]).toMatchObject({
      id: "user-1",
      email: "owner@example.com",
      role: "SUPER_ADMIN",
    });
  });

  it("returns the correct empty-state payload for the users directory", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "super-1", role: "SUPER_ADMIN" });
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ suspendedAt: null }])
      .mockResolvedValueOnce([{ count: 0n }])
      .mockResolvedValueOnce([]);

    const response = await request(app)
      .get("/admin/users?page=2&pageSize=5")
      .set("Cookie", signAuthCookie({ id: "super-1", role: "SUPER_ADMIN" }));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      users: [],
      page: 2,
      pageSize: 5,
      total: 0,
      totalPages: 1,
    });
  });

  it("passes simple users filters through the query layer", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "super-1", role: "SUPER_ADMIN" });
    prismaMock.$queryRaw
      .mockResolvedValueOnce([{ suspendedAt: null }])
      .mockResolvedValueOnce([{ count: 1n }])
      .mockResolvedValueOnce([]);

    const response = await request(app)
      .get("/admin/users?status=suspended&search=owner&page=3&pageSize=7")
      .set("Cookie", signAuthCookie({ id: "super-1", role: "SUPER_ADMIN" }));

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(3);
    expect(response.body.pageSize).toBe(7);

    const countQuery = prismaMock.$queryRaw.mock.calls[1]?.[0] as { values?: unknown[] };
    const listQuery = prismaMock.$queryRaw.mock.calls[2]?.[0] as { values?: unknown[] };

    expect(countQuery.values).toEqual(expect.arrayContaining(["%owner%"]));
    expect(listQuery.values).toEqual(expect.arrayContaining(["%owner%", 14, 7]));
  });

  it("blocks non-super roles from the users directory", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });

    const response = await request(app)
      .get("/admin/users")
      .set("Cookie", signAuthCookie({ id: "admin-1", role: "WORKSPACE_ADMIN" }));

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("forbidden");
  });

  it("allows SUPER_ADMIN to access workspace-scoped audit logs", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "super-1", role: "SUPER_ADMIN" });
    prismaMock.workspace.findUnique.mockResolvedValue({ id: "ws-2" });

    const response = await request(app)
      .get("/admin/audit-logs?page=1&pageSize=20&action=order.created")
      .set("Cookie", buildWorkspaceCookies({ id: "super-1", role: "SUPER_ADMIN" }, "ws-2"))
      .set("x-workspace-id", "ws-2");

    expect(response.status).toBe(200);
    expect(prismaMock.auditLog.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: "ws-2",
          action: "order.created",
        }),
      })
    );
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workspaceId: "ws-2",
          action: "order.created",
        }),
      })
    );
  });

  it("returns the correct empty-state payload for audit logs", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });
    prismaMock.auditLog.count.mockResolvedValue(0);
    prismaMock.auditLog.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get("/admin/audit-logs?page=2&pageSize=5")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      logs: [],
      page: 2,
      pageSize: 5,
      total: 0,
      totalPages: 1,
    });
  });

  it("applies audit log filters within the selected workspace", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });

    const response = await request(app)
      .get("/admin/audit-logs?actorId=user-7&action=order.created&entityType=order&dateFrom=2026-03-01T00:00:00.000Z&dateTo=2026-03-13T00:00:00.000Z&page=1&pageSize=10")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-9"))
      .set("x-workspace-id", "ws-9");

    expect(response.status).toBe(200);
    expect(prismaMock.auditLog.count).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-9",
        actorId: "user-7",
        action: "order.created",
        entityType: "order",
        createdAt: {
          gte: new Date("2026-03-01T00:00:00.000Z"),
          lte: new Date("2026-03-13T00:00:00.000Z"),
        },
      },
    });
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-9",
        actorId: "user-7",
        action: "order.created",
        entityType: "order",
        createdAt: {
          gte: new Date("2026-03-01T00:00:00.000Z"),
          lte: new Date("2026-03-13T00:00:00.000Z"),
        },
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 10,
    });
  });

  it("rejects invalid audit log pagination values", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });

    const response = await request(app)
      .get("/admin/audit-logs?page=0&pageSize=101")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Value must be an integer between");
    expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("ignores malformed audit date filters instead of crashing", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });

    const response = await request(app)
      .get("/admin/audit-logs?dateFrom=not-a-date&dateTo=also-bad&unknownField=ignored")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-5"))
      .set("x-workspace-id", "ws-5");

    expect(response.status).toBe(200);
    expect(prismaMock.auditLog.count).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-5",
      },
    });
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        workspaceId: "ws-5",
      },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20,
    });
  });

  it("rejects invalid workspace ids for audit log access", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });

    const response = await request(app)
      .get("/admin/audit-logs")
      .set("Cookie", `${signAuthCookie({ id: "admin-1", role: "WORKSPACE_ADMIN" })}; ws=bad space`)
      .set("x-workspace-id", "bad space");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("allows WORKSPACE_ADMIN to access audit logs for their workspace", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });

    const response = await request(app)
      .get("/admin/audit-logs")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(200);
    expect(prismaMock.workspaceMember.findUnique).toHaveBeenCalledWith({
      where: {
        workspaceId_userId: {
          workspaceId: "ws-1",
          userId: "admin-1",
        },
      },
      select: { role: true },
    });
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: "ws-1" }),
      })
    );
  });

  it("blocks WORKSPACE_VIEWER from audit logs", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "viewer-1", role: "WORKSPACE_VIEWER" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_VIEWER" });

    const response = await request(app)
      .get("/admin/audit-logs")
      .set("Cookie", buildWorkspaceCookies({ id: "viewer-1", role: "WORKSPACE_VIEWER" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("forbidden");
    expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
  });

  it("blocks users without workspace membership from audit logs", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "viewer-2", role: "WORKSPACE_VIEWER" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue(null);
    prismaMock.workspace.findUnique.mockResolvedValue({ id: "ws-9", createdByUserId: "someone-else" });

    const response = await request(app)
      .get("/admin/audit-logs")
      .set("Cookie", buildWorkspaceCookies({ id: "viewer-2", role: "WORKSPACE_VIEWER" }, "ws-9"))
      .set("x-workspace-id", "ws-9");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("not_a_member");
  });
});
