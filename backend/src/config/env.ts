type NodeEnv = "development" | "test" | "production";
type SameSiteMode = "lax" | "none";

export type AppEnv = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: NodeEnv;
  PORT: number;
  ALLOWED_ORIGINS: string[];
  AUTH_COOKIE_NAME: string;
  WORKSPACE_COOKIE_NAME: string;
  AUTH_COOKIE_SAMESITE: SameSiteMode;
  CSRF_COOKIE_NAME: string;
  CSRF_HEADER_NAME: string;
  ALLOW_BEARER_AUTH: boolean;
};

function requireNonEmpty(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

function parseNodeEnv(value: string): NodeEnv {
  if (value === "development" || value === "test" || value === "production") {
    return value;
  }
  throw new Error("[env] NODE_ENV must be one of: development, test, production");
}

function parsePort(value: string | undefined): number {
  if (!value) return 4000;
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("[env] PORT must be a positive integer");
  }
  return port;
}

function parseCookieName(name: string, fallback: string): string {
  const value = process.env[name]?.trim() || fallback;
  if (!/^[a-zA-Z0-9_-]{2,64}$/.test(value)) {
    throw new Error(`[env] ${name} must contain only letters, numbers, "_" or "-"`);
  }
  return value;
}

function parseSameSite(value: string | undefined): SameSiteMode {
  const normalized = value?.trim().toLowerCase() || "lax";
  if (normalized === "lax" || normalized === "none") {
    return normalized;
  }
  throw new Error('[env] AUTH_COOKIE_SAMESITE must be either "lax" or "none"');
}

function parseBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`[env] ${name} must be either "true" or "false"`);
}

function parseAllowedOrigins(): string[] {
  const raw =
    process.env.ALLOWED_ORIGINS ??
    process.env.CSRF_ALLOWED_ORIGINS ??
    process.env.FRONTEND_ORIGIN ??
    "http://localhost:5173,http://127.0.0.1:5173";

  const origins = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("[env] ALLOWED_ORIGINS must contain at least one origin");
  }

  for (const origin of origins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`[env] Invalid origin in ALLOWED_ORIGINS: ${origin}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`[env] Invalid origin protocol in ALLOWED_ORIGINS: ${origin}`);
    }
  }

  return origins;
}

function parseHeaderName(name: string, fallback: string): string {
  const value = process.env[name]?.trim().toLowerCase() || fallback;
  if (!/^[a-z0-9-]{3,64}$/.test(value)) {
    throw new Error(`[env] ${name} must contain only lowercase letters, numbers, and "-"`);
  }
  return value;
}

function validateJwtSecret(secret: string, nodeEnv: NodeEnv) {
  const looksLikeExample = secret === "replace-with-strong-secret";
  if (nodeEnv === "production" && (secret.length < 16 || looksLikeExample)) {
    throw new Error("[env] JWT_SECRET must be a non-default value with at least 16 characters in production");
  }
}

export function validateEnv(): AppEnv {
  const DATABASE_URL = requireNonEmpty("DATABASE_URL");
  const JWT_SECRET = requireNonEmpty("JWT_SECRET");
  const NODE_ENV = parseNodeEnv(requireNonEmpty("NODE_ENV"));
  const PORT = parsePort(process.env.PORT);
  const ALLOWED_ORIGINS = parseAllowedOrigins();
  const AUTH_COOKIE_NAME = parseCookieName("AUTH_COOKIE_NAME", "auth_token");
  const WORKSPACE_COOKIE_NAME = parseCookieName("WORKSPACE_COOKIE_NAME", "ws");
  const AUTH_COOKIE_SAMESITE = parseSameSite(process.env.AUTH_COOKIE_SAMESITE);
  const CSRF_COOKIE_NAME = parseCookieName("CSRF_COOKIE_NAME", "csrf_token");
  const CSRF_HEADER_NAME = parseHeaderName("CSRF_HEADER_NAME", "x-csrf-token");
  const ALLOW_BEARER_AUTH = parseBoolean("ALLOW_BEARER_AUTH", false);

  validateJwtSecret(JWT_SECRET, NODE_ENV);

  return {
    DATABASE_URL,
    JWT_SECRET,
    NODE_ENV,
    PORT,
    ALLOWED_ORIGINS,
    AUTH_COOKIE_NAME,
    WORKSPACE_COOKIE_NAME,
    AUTH_COOKIE_SAMESITE,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    ALLOW_BEARER_AUTH,
  };
}

export const env = validateEnv();
