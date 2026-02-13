import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Role } from "@prisma/client";
import prisma from "./lib/prisma.js";
import courseRoutes from "./routes/courses.js";
import instructorRoutes from "./routes/instructor.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthRequest } from "./middleware/auth.js";
import studentRoutes from "./routes/student.js";
import { hardDeleteCourse } from "./services/instructorService.js";
import { validateProfileUpdatePayload } from "./validation/profileValidation.js";
import { sendError } from "./utils/httpError.js";

const app = express();

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? "";
const IS_PROD = process.env.NODE_ENV === "production";
const IS_TEST = process.env.NODE_ENV === "test";
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ??
  process.env.CSRF_ALLOWED_ORIGINS ??
  process.env.FRONTEND_ORIGIN ??
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME ?? "auth_token";
const AUTH_COOKIE_SAMESITE = process.env.AUTH_COOKIE_SAMESITE ?? "lax";

if (!JWT_SECRET) {
  if (IS_PROD) {
    throw new Error("JWT_SECRET must be set in production");
  }
  if (!IS_TEST) {
    console.warn("JWT_SECRET is not set. Dev mode is running with insecure auth secret behavior.");
  }
}

if (!IS_PROD && (prisma as unknown as Record<string, unknown>).passwordResetToken === undefined) {
  throw new Error("Prisma client is missing passwordResetToken delegate. Run `npx prisma generate`.");
}

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  if (!["POST", "PATCH", "DELETE", "PUT"].includes(method)) {
    return next();
  }
  const origin = req.headers.origin;
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return sendError(res, 403, "Invalid request origin", "FORBIDDEN");
  }
  return next();
});
app.use("/courses", courseRoutes);
app.use(studentRoutes);
app.use("/instructor", instructorRoutes);

type AuthPayload = {
  sub: string;
  role: Role;
};

function signToken(user: { id: string; role: Role }) {
  return jwt.sign({ sub: user.id, role: user.role } satisfies AuthPayload, JWT_SECRET, {
    expiresIn: "7d",
  });
}

function setAuthCookie(res: express.Response, token: string) {
  const sameSite = AUTH_COOKIE_SAMESITE === "none" ? "none" : "lax";
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite,
    secure: IS_PROD,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res: express.Response) {
  const sameSite = AUTH_COOKIE_SAMESITE === "none" ? "none" : "lax";
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite,
    secure: IS_PROD,
    path: "/",
  });
}

function parseRole(input?: string): Role | null {
  if (!input) return null;
  const normalized = input.trim().toUpperCase();
  if (normalized === "ADMIN") return Role.ADMIN;
  if (normalized === "INSTRUCTOR") return Role.INSTRUCTOR;
  if (normalized === "STUDENT") return Role.STUDENT;
  return null;
}

function getSingleParam(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/auth/register", async (req, res) => {
  const { email, password, role } = req.body as {
    email?: string;
    password?: string;
    role?: string;
  };

  if (!email || !password) {
    return sendError(res, 400, "Email and password are required", "VALIDATION_ERROR");
  }

  if (role !== undefined) {
    return sendError(res, 400, "Role cannot be set via registration", "VALIDATION_ERROR");
  }

  if (password.length < 6) {
    return sendError(res, 400, "Password must be at least 6 characters", "VALIDATION_ERROR");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return sendError(res, 409, "Email already registered", "CONFLICT");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: Role.STUDENT,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  const token = signToken({ id: user.id, role: user.role });
  return res.status(201).json({ token, user });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return sendError(res, 400, "Email and password are required", "VALIDATION_ERROR");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return sendError(res, 401, "Invalid credentials", "UNAUTHORIZED");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return sendError(res, 401, "Invalid credentials", "UNAUTHORIZED");
  }

  const token = signToken({ id: user.id, role: user.role });
  setAuthCookie(res, token);
  return res.json({
    user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
  });
});

app.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body as { email?: string };
  const response: { ok: true; resetLink?: string } = { ok: true };

  if (!email) {
    return res.status(200).json(response);
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      if (!IS_PROD) {
        const resetLink = `http://localhost:5173/reset-password?token=${rawToken}`;
        console.log("DEV_RESET_LINK:", resetLink);
        response.resetLink = resetLink;
      }
    }
  } catch (err) {
    console.error("FORGOT_PASSWORD_ERROR", err);
  }

  return res.status(200).json(response);
});

app.post("/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };

  if (!token || !newPassword) {
    return sendError(res, 400, "Token and new password are required", "VALIDATION_ERROR");
  }

  if (newPassword.length < 6) {
    return sendError(res, 400, "Password must be at least 6 characters", "VALIDATION_ERROR");
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const now = new Date();

  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    select: { id: true, userId: true },
  });

  if (!resetRecord) {
    return sendError(res, 400, "Reset token is invalid or expired", "VALIDATION_ERROR");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: now },
    }),
  ]);

  return res.json({ ok: true });
});

app.get("/me", requireAuth, async (req: AuthRequest, res) => {
  if (!req.user) {
    return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        phoneCountry: true,
        phoneE164: true,
        address: true,
        createdAt: true,
      },
    });

    if (!user) {
      return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
    }

    return res.json({ user });
  } catch (error) {
    console.error("GET /me failed", error);
    return sendError(res, 500, "Unable to load session", "INTERNAL_ERROR");
  }
});

app.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  if (!req.user) {
    return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
  }

  const validation = validateProfileUpdatePayload(req.body as Record<string, unknown>);
  if (!validation.ok) {
    return sendError(res, 400, validation.message, "VALIDATION_ERROR", validation.fieldErrors);
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: validation.data,
    select: {
      id: true,
      email: true,
      role: true,
      fullName: true,
      phone: true,
      phoneCountry: true,
      phoneE164: true,
      address: true,
      createdAt: true,
    },
  });

  return res.json({ user: updated });
});

app.post("/admin/users/:id/role", requireAuth, requireRole([Role.ADMIN]), async (req, res) => {
  const userId = getSingleParam(req.params.id);
  const { role } = req.body as { role?: string };
  const resolvedRole = parseRole(role);

  if (!userId) {
    return sendError(res, 400, "User id is required", "VALIDATION_ERROR");
  }

  if (!resolvedRole || resolvedRole === Role.STUDENT) {
    return sendError(res, 400, "Role must be INSTRUCTOR or ADMIN", "VALIDATION_ERROR");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: resolvedRole },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  return res.json({ user: updated });
});

app.get("/admin/delete-requests", requireAuth, requireRole([Role.ADMIN]), async (_req, res) => {
  const requests = await prisma.deletionRequest.findMany({
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
});

app.post("/admin/delete-requests/:id/approve", requireAuth, requireRole([Role.ADMIN]), async (req: AuthRequest, res) => {
  const requestId = getSingleParam(req.params.id);
  if (!requestId) {
    return sendError(res, 400, "Request id is required", "VALIDATION_ERROR");
  }
  if (!req.user) {
    return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
  }

  const request = await prisma.deletionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, courseId: true },
  });
  if (!request) {
    return sendError(res, 404, "Deletion request not found", "NOT_FOUND");
  }
  if (request.status !== "PENDING") {
    return sendError(res, 409, "Deletion request already decided", "CONFLICT");
  }

  const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote.trim() : null;
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
        status: "APPROVED",
        adminNote,
        decidedAt: now,
        decidedById: req.user.id,
      },
    }),
  ]);

  return res.json({ ok: true, archivedCourseId: request.courseId });
});

app.post("/admin/delete-requests/:id/reject", requireAuth, requireRole([Role.ADMIN]), async (req: AuthRequest, res) => {
  const requestId = getSingleParam(req.params.id);
  if (!requestId) {
    return sendError(res, 400, "Request id is required", "VALIDATION_ERROR");
  }
  if (!req.user) {
    return sendError(res, 401, "Unauthorized", "UNAUTHORIZED");
  }
  const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote.trim() : "";
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
  if (request.status !== "PENDING") {
    return sendError(res, 409, "Deletion request already decided", "CONFLICT");
  }

  const now = new Date();
  await prisma.deletionRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      adminNote,
      decidedAt: now,
      decidedById: req.user.id,
    },
  });

  return res.json({ ok: true, rejectedId: request.id });
});

app.delete("/admin/courses/:id/hard-delete", requireAuth, requireRole([Role.ADMIN]), async (req, res) => {
  const courseId = getSingleParam(req.params.id);
  if (!courseId) {
    return sendError(res, 400, "Course id is required", "VALIDATION_ERROR");
  }
  const result = await hardDeleteCourse(courseId);
  return res.json({ ok: true, deletedId: result.deletedId });
});

app.delete("/admin/users/:id", requireAuth, requireRole([Role.ADMIN]), async (req, res) => {
  const userId = getSingleParam(req.params.id);
  if (!userId) {
    return sendError(res, 400, "User id is required", "VALIDATION_ERROR");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target) {
    return sendError(res, 404, "User not found", "NOT_FOUND");
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
  return res.json({ ok: true, deletedId: userId });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
