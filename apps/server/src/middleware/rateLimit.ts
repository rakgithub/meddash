import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";

export interface RateLimit {
  max: number;
  windowMs: number;
}

const HOUR = 60 * 60 * 1000;

/**
 * In-memory sliding window per signed-in user (needs `requireAuth` first). Every request that reaches
 * it counts. One process only: each server instance keeps its own counts.
 */
export function createRateLimiter(
  limits: RateLimit[],
  now: () => number = Date.now,
): RequestHandler {
  const longestWindow = Math.max(...limits.map((l) => l.windowMs));
  const hits = new Map<number, number[]>();
  let lastSweep = now();

  const recent = (times: number[], at: number) => times.filter((t) => t > at - longestWindow);

  // Users who stop sending never get pruned on access, so drop them now and then.
  function sweep(at: number) {
    if (at - lastSweep < HOUR) return;
    lastSweep = at;
    for (const [userId, times] of hits) {
      const kept = recent(times, at);
      if (kept.length) hits.set(userId, kept);
      else hits.delete(userId);
    }
  }

  return (_req, res, next) => {
    const userId: unknown = res.locals.userId;
    if (typeof userId !== "number") {
      return next(new Error("createRateLimiter needs requireAuth before it"));
    }
    const at = now();
    sweep(at);
    const times = recent(hits.get(userId) ?? [], at);

    for (const { max, windowMs } of limits) {
      const inWindow = times.filter((t) => t > at - windowMs);
      if (inWindow.length >= max) {
        // The oldest hit in the window is the next one to drop out of it.
        const retryAfterMs = inWindow[0] + windowMs - at;
        res.set("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
        hits.set(userId, times);
        return next(new AppError(429, "Too many messages. Please try again later."));
      }
    }

    times.push(at);
    hits.set(userId, times);
    next();
  };
}
