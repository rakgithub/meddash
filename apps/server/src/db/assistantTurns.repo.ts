import { and, count, eq, gt, lte, sql } from "drizzle-orm";
import type { RateLimit, RateLimitDecision } from "../middleware/rateLimit.js";
import { db } from "./client.js";
import { assistantTurns, users } from "./schema.js";

// Database time, so every instance measures the windows against the same clock.
const since = (windowMs: number) => sql`now() - make_interval(secs => ${windowMs / 1000})`;

/**
 * Records an assistant turn for the user unless a limit is full. When one is, returns how long until
 * its oldest turn leaves the window. Also prunes the user's turns older than the longest window.
 */
export async function recordAssistantTurn(
  userId: number,
  limits: RateLimit[],
): Promise<RateLimitDecision> {
  const longestWindow = Math.max(...limits.map((l) => l.windowMs));

  return db.transaction(async (tx) => {
    // Concurrent turns of one user queue on this lock, so each one counts the turns committed before
    // it. A single INSERT ... SELECT would not: both would count from the same snapshot.
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .for("no key update");
    if (!user) throw new Error(`recordAssistantTurn: no user ${userId}`);

    const ofUser = eq(assistantTurns.userId, userId);
    await tx
      .delete(assistantTurns)
      .where(and(ofUser, lte(assistantTurns.createdAt, since(longestWindow))));

    for (const { max, windowMs } of limits) {
      const [window] = await tx
        .select({
          turns: count(),
          // The oldest turn in the window is the next one to leave it.
          retryAfterMs:
            sql`extract(epoch from min(${assistantTurns.createdAt}) + make_interval(secs => ${windowMs / 1000}) - now()) * 1000`.mapWith(
              Number,
            ),
        })
        .from(assistantTurns)
        .where(and(ofUser, gt(assistantTurns.createdAt, since(windowMs))));
      if (window.turns >= max) return { allowed: false, retryAfterMs: window.retryAfterMs };
    }

    await tx.insert(assistantTurns).values({ userId });
    return { allowed: true };
  });
}
