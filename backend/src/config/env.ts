type NodeEnv = "development" | "test" | "production";

export type AppEnv = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  NODE_ENV: NodeEnv;
  PORT: number;
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

export function validateEnv(): AppEnv {
  const DATABASE_URL = requireNonEmpty("DATABASE_URL");
  const JWT_SECRET = requireNonEmpty("JWT_SECRET");
  const NODE_ENV = parseNodeEnv(requireNonEmpty("NODE_ENV"));
  const PORT = parsePort(process.env.PORT);

  return {
    DATABASE_URL,
    JWT_SECRET,
    NODE_ENV,
    PORT,
  };
}

export const env = validateEnv();

