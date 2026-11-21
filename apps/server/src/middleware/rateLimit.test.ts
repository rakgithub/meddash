import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "./errorHandler.js";
import { createRateLimiter, type RateLimit, type RateLimitStore } from "./rateLimit.js";

const limits: RateLimit[] = [{ max: 2, windowMs: 60_000 }];

/** A tiny app where the `x-user` header stands in for requireAuth. */
function setup(store: RateLimitStore) {
  const app = express();
  app.use((req, res, next) => {
    const user = req.get("x-user");
    if (user) res.locals.userId = Number(user);
    next();
  });
  app.use(createRateLimiter(limits, store));
  app.get("/", (_req, res) => {
    res.sendStatus(204);
  });
  app.use(errorHandler);

  return (user: string | null = "1") => {
    const req = request(app).get("/");
    return user ? req.set("x-user", user) : req;
  };
}

describe("createRateLimiter", () => {
  it("asks the store for the signed-in user and lets an allowed request through", async () => {
    const store = vi.fn<RateLimitStore>().mockResolvedValue({ allowed: true });
    const res = await setup(store)("7");
    expect(res.status).toBe(204);
    expect(store).toHaveBeenCalledWith(7, limits);
  });

  it("answers 429 with Retry-After in whole seconds, rounded up", async () => {
    const store = vi
      .fn<RateLimitStore>()
      .mockResolvedValue({ allowed: false, retryAfterMs: 1_500 });
    const res = await setup(store)();
    expect(res.status).toBe(429);
    expect(res.body.error.message).toBe("Too many messages. Please try again later.");
    expect(res.headers["retry-after"]).toBe("2");
  });

  it("fails as a server error when the store fails", async () => {
    const store = vi.fn<RateLimitStore>().mockRejectedValue(new Error("db down"));
    expect((await setup(store)()).status).toBe(500);
  });

  it("fails as a server error when requireAuth did not run first", async () => {
    const store = vi.fn<RateLimitStore>();
    expect((await setup(store)(null)).status).toBe(500);
    expect(store).not.toHaveBeenCalled();
  });
});
