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
  },
  workspaceMember: {
    findUnique: vi.fn(),
  },
  workspaceSettings: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  auditLog: {
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
}) {
  return `${signAuthCookie(user)}; ws=ws-1`;
}

describe("workspace settings routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$queryRaw.mockResolvedValue([{ suspendedAt: null }]);
  });

  it("returns settings for a workspace admin", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceSettings.findUnique.mockResolvedValue({
      workspaceId: "ws-1",
      displayName: "Revenue Ops",
      updatedAt: new Date("2026-03-13T00:00:00.000Z"),
    });

    const response = await request(app)
      .get("/admin/settings")
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(200);
    expect(response.body.settings).toMatchObject({
      workspaceId: "ws-1",
      displayName: "Revenue Ops",
    });
  });

  it("updates settings for a workspace admin and writes an audit record", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceSettings.upsert.mockResolvedValue({
      workspaceId: "ws-1",
      displayName: "Growth Command Center",
      updatedAt: new Date("2026-03-13T01:00:00.000Z"),
    });

    const agent = request.agent(app);
    const csrfResponse = await agent.get("/auth/csrf");

    const response = await agent
      .patch("/admin/settings")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfResponse.body.csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }))
      .set("x-workspace-id", "ws-1")
      .send({ displayName: "Growth Command Center" });

    expect(response.status).toBe(200);
    expect(prismaMock.workspaceSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws-1" },
        update: { displayName: "Growth Command Center" },
      })
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: "ws-1",
          action: "workspace.settings_updated",
          entityType: "workspace_settings",
          actorId: "admin-1",
        }),
      })
    );
  });

  it("forbids workspace viewers from reading settings", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "viewer-1", role: "WORKSPACE_VIEWER" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_VIEWER" });

    const response = await request(app)
      .get("/admin/settings")
      .set("Cookie", buildWorkspaceCookies({ id: "viewer-1", role: "WORKSPACE_VIEWER" }))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("forbidden");
  });

  it("rejects unsupported fields in settings updates", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });

    const agent = request.agent(app);
    const csrfResponse = await agent.get("/auth/csrf");

    const response = await agent
      .patch("/admin/settings")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfResponse.body.csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }))
      .set("x-workspace-id", "ws-1")
      .send({ displayName: "Revenue Ops", timezone: "UTC" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Unknown field(s): timezone");
    expect(prismaMock.workspaceSettings.upsert).not.toHaveBeenCalled();
  });

  it("rejects invalid workspace ids before hitting settings handlers", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });

    const response = await request(app)
      .get("/admin/settings")
      .set("Cookie", `${signAuthCookie({ id: "admin-1", role: "WORKSPACE_ADMIN" })}; ws=bad space`)
      .set("x-workspace-id", "bad space");

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(prismaMock.workspaceSettings.findUnique).not.toHaveBeenCalled();
  });
});
