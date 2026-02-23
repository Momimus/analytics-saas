import type { Request, Response } from "express";
import { createRateLimiter, __resetRateLimitStateForTests } from "../middleware/rateLimit.js";

describe("rate limiter", () => {
  beforeEach(async () => {
    delete process.env.REDIS_URL;
    await __resetRateLimitStateForTests();
  });

  it("blocks after configured max requests", async () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 2,
      message: "Too many requests",
      keyGenerator: () => "unit-test-key",
    });

    const req = { headers: {}, ip: "127.0.0.1" } as Request;
    const next = vi.fn();
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as unknown as Response;

    await limiter(req, res, next);
    await limiter(req, res, next);
    await limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenCalledWith(429);
  });
});
