import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/httpError.js";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
};

type RateLimitStore = {
  hit: (key: string, windowMs: number) => Promise<{ count: number }>;
  reset?: () => Promise<void>;
};

const memoryStore = new Map<string, RateLimitRecord>();
let globalStorePromise: Promise<RateLimitStore> | null = null;
let warnedRedisUnavailable = false;
let warnedRedisClientMissing = false;

function nowMs() {
  return Date.now();
}

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim().length > 0) {
    return forwarded.split(",")[0]?.trim() ?? req.ip;
  }
  return req.ip;
}

export function hashIdentifier(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createMemoryStore(): RateLimitStore {
  return {
    async hit(key: string, windowMs: number) {
      const current = nowMs();
      const existing = memoryStore.get(key);
      if (!existing || current >= existing.resetAt) {
        memoryStore.set(key, { count: 1, resetAt: current + windowMs });
        return { count: 1 };
      }
      existing.count += 1;
      return { count: existing.count };
    },
    async reset() {
      memoryStore.clear();
    },
  };
}

async function createRedisStore(redisUrl: string): Promise<RateLimitStore | null> {
  const moduleName = "redis";
  let redisModule: unknown;
  try {
    redisModule = await import(moduleName);
  } catch {
    if (!warnedRedisClientMissing) {
      warnedRedisClientMissing = true;
      console.warn("REDIS_URL is set but redis package is not installed. Falling back to in-memory rate limiting.");
    }
    return null;
  }

  const maybeModule = redisModule as { createClient?: (args: { url: string }) => unknown };
  if (typeof maybeModule.createClient !== "function") {
    if (!warnedRedisClientMissing) {
      warnedRedisClientMissing = true;
      console.warn("REDIS_URL is set but redis client API is unavailable. Falling back to in-memory rate limiting.");
    }
    return null;
  }

  const client = maybeModule.createClient({ url: redisUrl }) as {
    connect: () => Promise<void>;
    incr: (key: string) => Promise<number>;
    pExpire: (key: string, ms: number) => Promise<number>;
    on?: (event: string, handler: (...args: unknown[]) => void) => void;
    quit?: () => Promise<void>;
  };

  client.on?.("error", () => {
    if (!warnedRedisUnavailable) {
      warnedRedisUnavailable = true;
      console.warn("Redis rate-limit store error detected. Requests continue, but limits may degrade.");
    }
  });

  try {
    await client.connect();
  } catch {
    if (!warnedRedisUnavailable) {
      warnedRedisUnavailable = true;
      console.warn("Unable to connect to REDIS_URL. Falling back to in-memory rate limiting.");
    }
    return null;
  }

  return {
    async hit(key: string, windowMs: number) {
      const count = await client.incr(key);
      if (count === 1) {
        await client.pExpire(key, windowMs);
      }
      return { count };
    },
    async reset() {
      if (client.quit) {
        await client.quit();
      }
    },
  };
}

async function resolveGlobalStore(): Promise<RateLimitStore> {
  if (globalStorePromise) {
    return globalStorePromise;
  }

  globalStorePromise = (async () => {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      return createMemoryStore();
    }

    const redisStore = await createRedisStore(redisUrl);
    return redisStore ?? createMemoryStore();
  })();

  return globalStorePromise;
}

export function createRateLimiter(options: RateLimitOptions) {
  const windowMs = options.windowMs;
  const max = options.max;
  const keyGenerator = options.keyGenerator ?? ((req: Request) => getClientIp(req));
  const storePromise = resolveGlobalStore();

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = (keyGenerator(req) ?? getClientIp(req) ?? "unknown").toString();
      const store = await storePromise;
      const result = await store.hit(key, windowMs);
      if (result.count > max) {
        return sendError(res, 429, options.message, "TOO_MANY_REQUESTS");
      }
      return next();
    } catch {
      const memory = createMemoryStore();
      const key = (keyGenerator(req) ?? getClientIp(req) ?? "unknown").toString();
      const result = await memory.hit(key, windowMs);
      if (result.count > max) {
        return sendError(res, 429, options.message, "TOO_MANY_REQUESTS");
      }
      return next();
    }
  };
}

export async function __resetRateLimitStateForTests() {
  memoryStore.clear();
  globalStorePromise = null;
}
