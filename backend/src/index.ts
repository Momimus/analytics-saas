import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { Role } from "@prisma/client";
import prisma from "./lib/prisma.js";
import courseRoutes from "./routes/courses.js";
import instructorRoutes from "./routes/instructor.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth, requireRole, type AuthRequest } from "./middleware/auth.js";
import studentRoutes from "./routes/student.js";
import { hardDeleteCourse } from "./services/instructorService.js";

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
    return res.status(403).json({ error: "Invalid request origin" });
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
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (role !== undefined) {
    return res.status(400).json({ error: "Role cannot be set via registration" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
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
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
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
    return res.status(400).json({ error: "Token and new password are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
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
    return res.status(400).json({ error: "Reset token is invalid or expired" });
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
    return res.status(401).json({ error: "Unauthorized" });
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
      return res.status(401).json({ error: "Unauthorized" });
    }

    return res.json({ user });
  } catch (error) {
    console.error("GET /me failed", error);
    return res.status(500).json({ error: "Unable to load session" });
  }
});

app.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { fullName, phone, address, phoneCountry } = req.body as {
    fullName?: string;
    phone?: string;
    address?: string;
    phoneCountry?: string;
  };

  if (typeof fullName === "string" && fullName.length > 80) {
    return res.status(400).json({ error: "Full name must be at most 80 characters" });
  }
  if (typeof phone === "string" && phone.length > 30) {
    return res.status(400).json({ error: "Phone must be at most 30 characters" });
  }
  if (typeof address === "string" && address.length > 200) {
    return res.status(400).json({ error: "Address must be at most 200 characters" });
  }

  const normalizedCountry =
    typeof phoneCountry === "string" && phoneCountry.trim().length > 0
      ? phoneCountry.trim().toUpperCase()
      : null;
  const hasPhone = typeof phone === "string" && phone.trim().length > 0;

  let phoneE164: string | null = null;

  if (hasPhone) {
    if (!normalizedCountry) {
      return res.status(400).json({ error: "Phone country is required when phone is provided" });
    }
    if (!/^[A-Z]{2}$/.test(normalizedCountry)) {
      return res.status(400).json({ error: "Phone country must be a valid ISO-2 code" });
    }
    const parsed = parsePhoneNumberFromString(phone, normalizedCountry as CountryCode);
    if (!parsed || !parsed.isValid()) {
      return res.status(400).json({ error: "Phone number is invalid for selected country" });
    }
    phoneE164 = parsed.number;
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      fullName: typeof fullName === "string" ? fullName.trim() : undefined,
      phone: typeof phone === "string" ? (hasPhone ? phone.trim() : null) : undefined,
      phoneCountry: phone === undefined ? undefined : hasPhone ? normalizedCountry : null,
      phoneE164: phone === undefined ? undefined : phoneE164,
      address: typeof address === "string" ? address.trim() : undefined,
    },
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
    return res.status(400).json({ error: "User id is required" });
  }

  if (!resolvedRole || resolvedRole === Role.STUDENT) {
    return res.status(400).json({ error: "Role must be INSTRUCTOR or ADMIN" });
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
    return res.status(400).json({ error: "Request id is required" });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const request = await prisma.deletionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true, courseId: true },
  });
  if (!request) {
    return res.status(404).json({ error: "Deletion request not found" });
  }
  if (request.status !== "PENDING") {
    return res.status(409).json({ error: "Deletion request already decided" });
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
    return res.status(400).json({ error: "Request id is required" });
  }
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const adminNote = typeof req.body?.adminNote === "string" ? req.body.adminNote.trim() : "";
  if (!adminNote) {
    return res.status(400).json({ error: "adminNote is required when rejecting a deletion request" });
  }

  const request = await prisma.deletionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, status: true },
  });
  if (!request) {
    return res.status(404).json({ error: "Deletion request not found" });
  }
  if (request.status !== "PENDING") {
    return res.status(409).json({ error: "Deletion request already decided" });
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
    return res.status(400).json({ error: "Course id is required" });
  }
  const result = await hardDeleteCourse(courseId);
  return res.json({ ok: true, deletedId: result.deletedId });
});

app.delete("/admin/users/:id", requireAuth, requireRole([Role.ADMIN]), async (req, res) => {
  const userId = getSingleParam(req.params.id);
  if (!userId) {
    return res.status(400).json({ error: "User id is required" });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target) {
    return res.status(404).json({ error: "User not found" });
  }

  if (target.role === Role.INSTRUCTOR) {
    const ownedCourses = await prisma.course.count({
      where: { createdById: userId },
    });
    if (ownedCourses > 0) {
      return res.status(409).json({ error: "Cannot delete instructor who still owns courses" });
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  return res.json({ ok: true, deletedId: userId });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
