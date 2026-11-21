import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";

export interface RateLimit {
  max: number;
  windowMs: number;
}

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterMs: number };

/**
 * Counts the user's request if every limit still allows it. It must decide and record in one atomic
 * step shared by all server instances, or concurrent requests and separate instances each get the
 * full allowance.
 */
export type RateLimitStore = (userId: number, limits: RateLimit[]) => Promise<RateLimitDecision>;

/**
 * Sliding window per signed-in user (needs `requireAuth` first). Every request that reaches it
 * counts; the store keeps the counts (Postgres in production, so they hold across instances).
 */
export function createRateLimiter(limits: RateLimit[], store: RateLimitStore): RequestHandler {
  return (_req, res, next) => {
    const userId: unknown = res.locals.userId;
    if (typeof userId !== "number") {
      return next(new Error("createRateLimiter needs requireAuth before it"));
    }
    store(userId, limits).then((decision) => {
      if (decision.allowed) return next();
      res.set("Retry-After", String(Math.ceil(decision.retryAfterMs / 1000)));
      next(new AppError(429, "Too many messages. Please try again later."));
    }, next);
  };
}
