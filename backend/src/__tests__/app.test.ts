import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret";
process.env.ALLOWED_ORIGINS = "http://localhost:5173";

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  $queryRaw: vi.fn(),
  passwordResetToken: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("../lib/prisma.js", () => ({
  default: prismaMock,
}));

const { app } = await import("../index.js");

describe("backend route behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$queryRaw.mockResolvedValue([{ suspendedAt: null }]);
  });

  it("logs in with valid credentials", async () => {
    const password = "secret123";
    const passwordHash = await bcrypt.hash(password, 10);

    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "student@example.com",
      passwordHash,
      role: "STUDENT",
      createdAt: new Date(),
    });

    const agent = request.agent(app);
    const csrfResponse = await agent.get("/auth/csrf");

    const response = await agent
      .post("/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfResponse.body.csrfToken)
      .send({ email: "student@example.com", password });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("student@example.com");
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("rejects mutating request when CSRF token is missing", async () => {
    const response = await request(app)
      .post("/auth/logout")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Invalid CSRF token");
  });

  it("allows CSRF-protected request with matching cookie/header token", async () => {
    const agent = request.agent(app);
    const csrfResponse = await agent.get("/auth/csrf");

    const logoutResponse = await agent
      .post("/auth/logout")
      .set("Origin", "http://localhost:5173")
      .set("x-csrf-token", csrfResponse.body.csrfToken);

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.ok).toBe(true);
  });

  it("blocks admin route when authenticated user is not admin", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-1",
      role: "STUDENT",
    });

    const token = jwt.sign(
      { sub: "student-1", role: "STUDENT" },
      "test-secret",
      { expiresIn: "1h" }
    );

    const response = await request(app)
      .get("/admin/metrics")
      .set("Cookie", `auth_token=${token}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("FORBIDDEN");
  });
});
