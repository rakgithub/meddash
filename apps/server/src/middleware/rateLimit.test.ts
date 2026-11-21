import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "./errorHandler.js";
import { createRateLimiter, type RateLimit } from "./rateLimit.js";

const MINUTE = 60_000;

/** A tiny app where the `x-user` header stands in for requireAuth, with a clock the test moves. */
function setup(limits: RateLimit[] = [{ max: 2, windowMs: 10 * MINUTE }]) {
  let time = 0;
  const app = express();
  app.use((req, res, next) => {
    const user = req.get("x-user");
    if (user) res.locals.userId = Number(user);
    next();
  });
  app.use(createRateLimiter(limits, () => time));
  app.get("/", (_req, res) => {
    res.sendStatus(204);
  });
  app.use(errorHandler);

  const call = (user: string | null = "1") => {
    const req = request(app).get("/");
    return user ? req.set("x-user", user) : req;
  };
  return { call, advance: (ms: number) => (time += ms) };
}

describe("createRateLimiter", () => {
  it("lets requests through up to the limit, then answers 429 with Retry-After", async () => {
    const { call, advance } = setup();
    expect((await call()).status).toBe(204);
    advance(MINUTE);
    expect((await call()).status).toBe(204);

    const res = await call();
    expect(res.status).toBe(429);
    expect(res.body.error.message).toBe("Too many messages. Please try again later.");
    // The first hit leaves the window 9 minutes from now.
    expect(res.headers["retry-after"]).toBe(String(9 * 60));
  });

  it("slides: a request is allowed again once the oldest one leaves the window", async () => {
    const { call, advance } = setup();
    await call();
    await call();
    advance(10 * MINUTE);
    expect((await call()).status).toBe(204);
  });

  it("does not count rejected requests", async () => {
    const { call, advance } = setup();
    await call();
    advance(5 * MINUTE);
    await call();
    expect((await call()).status).toBe(429);
    advance(5 * MINUTE + 1);
    expect((await call()).status).toBe(204);
  });

  it("keeps a separate count per user", async () => {
    const { call } = setup();
    await call("1");
    await call("1");
    expect((await call("2")).status).toBe(204);
  });

  it("applies every limit, e.g. a daily cap on top of a short window", async () => {
    const { call, advance } = setup([
      { max: 2, windowMs: MINUTE },
      { max: 3, windowMs: 24 * 60 * MINUTE },
    ]);
    await call();
    await call();
    advance(MINUTE);
    await call();
    advance(MINUTE);
    expect((await call()).status).toBe(429);
  });

  it("starts users afresh after the hourly sweep", async () => {
    const { call, advance } = setup([{ max: 1, windowMs: MINUTE }]);
    await call("1");
    advance(2 * 60 * MINUTE);
    expect((await call("2")).status).toBe(204);
    expect((await call("1")).status).toBe(204);
  });

  it("fails as a server error when requireAuth did not run first", async () => {
    const { call } = setup();
    expect((await call(null)).status).toBe(500);
  });
});
