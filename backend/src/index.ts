import "dotenv/config";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Role } from "@prisma/client";
import prisma from "./lib/prisma.js";
import adminRoutes from "./routes/admin.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth, type AuthRequest } from "./middleware/auth.js";
import { validateProfileUpdatePayload } from "./validation/profileValidation.js";
import { sendError } from "./utils/httpError.js";
import { createCsrfProtection } from "./middleware/csrf.js";
import { createRateLimiter, hashIdentifier } from "./middleware/rateLimit.js";

const app = express();

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET?.trim() ?? "";
const IS_PROD = process.env.NODE_ENV === "production";
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
const CSRF_COOKIE_NAME = process.env.CSRF_COOKIE_NAME ?? "csrf_token";
const CSRF_HEADER_NAME = (process.env.CSRF_HEADER_NAME ?? "x-csrf-token").toLowerCase();
const RETURN_REGISTER_TOKEN = process.env.RETURN_REGISTER_TOKEN === "true";

if (JWT_SECRET.length === 0) {
  if (IS_PROD) {
    throw new Error("JWT_SECRET must be a non-empty value in production");
  }
  console.warn("JWT_SECRET is empty. Non-production mode allows this, but it is insecure.");
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
app.use(
  createCsrfProtection({
    cookieName: CSRF_COOKIE_NAME,
    headerName: CSRF_HEADER_NAME,
  })
);

const authIpLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 10 * 60 * 1000),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 60),
  message: "Too many auth attempts. Please try again shortly.",
});

const loginIdentityLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_LOGIN_ID_WINDOW_MS ?? 10 * 60 * 1000),
  max: Number(process.env.AUTH_LOGIN_ID_MAX ?? 20),
  message: "Too many login attempts for this account. Please try again shortly.",
  keyGenerator: (req) => {
    const emailRaw = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${req.ip}:login:${hashIdentifier(emailRaw || "unknown")}`;
  },
});

const forgotIdentityLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_FORGOT_ID_WINDOW_MS ?? 10 * 60 * 1000),
  max: Number(process.env.AUTH_FORGOT_ID_MAX ?? 10),
  message: "Too many password reset requests. Please try again shortly.",
  keyGenerator: (req) => {
    const emailRaw = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${req.ip}:forgot:${hashIdentifier(emailRaw || "unknown")}`;
  },
});

const resetIdentityLimiter = createRateLimiter({
  windowMs: Number(process.env.AUTH_RESET_ID_WINDOW_MS ?? 10 * 60 * 1000),
  max: Number(process.env.AUTH_RESET_ID_MAX ?? 10),
  message: "Too many password reset attempts. Please try again shortly.",
  keyGenerator: (req) => {
    const tokenRaw = typeof req.body?.token === "string" ? req.body.token : "";
    return `${req.ip}:reset:${hashIdentifier(tokenRaw || "unknown")}`;
  },
});

app.use("/admin", adminRoutes);

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

function setCsrfCookie(res: express.Response, token: string) {
  const sameSite = AUTH_COOKIE_SAMESITE === "none" ? "none" : "lax";
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    sameSite,
    secure: IS_PROD,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function issueCsrfToken(res: express.Response) {
  const token = crypto.randomBytes(32).toString("hex");
  setCsrfCookie(res, token);
  return token;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/auth/csrf", (_req, res) => {
  const csrfToken = issueCsrfToken(res);
  return res.json({ csrfToken });
});

app.post("/auth/register", authIpLimiter, async (req, res) => {
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
  setAuthCookie(res, token);
  issueCsrfToken(res);
  return res.status(201).json({
    ...(RETURN_REGISTER_TOKEN ? { token } : {}),
    user,
  });
});

app.post("/auth/login", authIpLimiter, loginIdentityLimiter, async (req, res) => {
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

  const suspensionRows = await prisma.$queryRaw<Array<{ suspendedAt: Date | null }>>`
    SELECT "suspendedAt"
    FROM "User"
    WHERE "id" = ${user.id}
    LIMIT 1
  `;
  if (suspensionRows[0]?.suspendedAt) {
    return sendError(res, 403, "Account is suspended", "FORBIDDEN");
  }

  const token = signToken({ id: user.id, role: user.role });
  setAuthCookie(res, token);
  issueCsrfToken(res);
  return res.json({
    user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt },
  });
});

app.post("/auth/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

app.post("/auth/forgot-password", authIpLimiter, forgotIdentityLimiter, async (req, res) => {
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

app.post("/auth/reset-password", authIpLimiter, resetIdentityLimiter, async (req, res) => {
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

app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

export { app };
