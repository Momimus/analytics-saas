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
  product: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  order: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  analyticsEvent: {
    create: vi.fn(),
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

function buildWorkspaceCookies(
  user: { id: string; role: "SUPER_ADMIN" | "WORKSPACE_ADMIN" | "WORKSPACE_VIEWER" },
  workspaceId = "ws-1"
) {
  return `${signAuthCookie(user)}; ws=${workspaceId}`;
}

async function getCsrf(agent: ReturnType<typeof request.agent>) {
  const csrfResponse = await agent.get("/auth/csrf");
  return csrfResponse.body.csrfToken as string;
}

describe("workspace-scoped admin analytics mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$queryRaw.mockResolvedValue([{ suspendedAt: null }]);
    prismaMock.user.findUnique.mockResolvedValue({ id: "admin-1", role: "WORKSPACE_ADMIN" });
    prismaMock.workspace.findUnique.mockResolvedValue({ id: "ws-1" });
    prismaMock.workspace.findFirst.mockResolvedValue({ id: "ws-1" });
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ role: "WORKSPACE_ADMIN" });
    prismaMock.workspaceMember.findFirst.mockResolvedValue({ workspaceId: "ws-1" });
  });

  it("rejects invalid workspace ids before product creation", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post("/admin/products")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", `${signAuthCookie({ id: "admin-1", role: "WORKSPACE_ADMIN" })}; ws=bad space`)
      .set("x-workspace-id", "bad space")
      .send({ name: "Starter", price: 19 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("VALIDATION_ERROR");
    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });

  it("rejects unsupported fields when creating products", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post("/admin/products")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }))
      .set("x-workspace-id", "ws-1")
      .send({ name: "Starter", price: 19, color: "blue" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Unknown field(s): color");
    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });

  it("rejects invalid product payload values", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post("/admin/products")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }))
      .set("x-workspace-id", "ws-1")
      .send({ name: "A", price: "free", isActive: "yes" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("price must be a positive number");
    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });

  it("rejects archive requests for products outside the current workspace", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1", isActive: true, workspaceId: "ws-other" });

    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .delete("/admin/products/prod-1")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("product_not_found");
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });

  it("rejects unsupported fields when creating orders", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post("/admin/orders")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }))
      .set("x-workspace-id", "ws-1")
      .send({ productId: "prod-1", amount: 20, status: "completed", coupon: "SPRING" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Unknown field(s): coupon");
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it("rejects missing or invalid order payload fields", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post("/admin/orders")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }))
      .set("x-workspace-id", "ws-1")
      .send({ amount: 0, status: "invalid" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("amount must be a positive number");
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it("rejects cross-workspace product references when creating orders", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "prod-1", workspaceId: "ws-other" });

    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post("/admin/orders")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1")
      .send({ productId: "prod-1", amount: 20, status: "completed" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("product_not_found");
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it("rejects invalid order status updates", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .patch("/admin/orders/order-1/status")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1")
      .send({ status: "shipped" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("status must be one of: completed, pending, refunded, canceled");
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it("returns not found when updating a non-existing order", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .patch("/admin/orders/order-missing/status")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1")
      .send({ status: "completed" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("order_not_found");
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it("rejects unsupported fields when creating analytics events", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post("/admin/events")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1")
      .send({ eventName: "page_view", metadata: {}, debug: true });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("Unknown field(s): debug");
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("rejects malformed analytics event payloads", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post("/admin/events")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1")
      .send({ eventName: "x", metadata: [] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("eventName must be between 2 and 60 characters");
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("rejects cross-workspace order references when creating analytics events", async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: "order-1", workspaceId: "ws-other" });

    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .post("/admin/events")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1")
      .send({ eventName: "page_view", orderId: "order-1" });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("order_not_found");
    expect(prismaMock.analyticsEvent.create).not.toHaveBeenCalled();
  });

  it("does not reject numeric displayName values in settings updates and clears the field instead", async () => {
    prismaMock.workspaceSettings.upsert.mockResolvedValue({
      workspaceId: "ws-1",
      displayName: null,
      updatedAt: new Date("2026-03-13T02:00:00.000Z"),
    });

    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);

    const response = await agent
      .patch("/admin/settings")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfToken)
      .set("Cookie", buildWorkspaceCookies({ id: "admin-1", role: "WORKSPACE_ADMIN" }, "ws-1"))
      .set("x-workspace-id", "ws-1")
      .send({ displayName: 123 });

    expect(response.status).toBe(200);
    expect(prismaMock.workspaceSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { displayName: null },
        create: { workspaceId: "ws-1", displayName: null },
      })
    );
  });
});
