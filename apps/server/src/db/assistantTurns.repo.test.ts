import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { recordAssistantTurn } from "./assistantTurns.repo.js";
import { db } from "./client.js";
import { assistantTurns, users } from "./schema.js";

// Runs against the test database. Each test uses its own user, so tests never share counts.
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const limits = [{ max: 2, windowMs: 10 * MINUTE }];

async function newUser() {
  const [user] = await db
    .insert(users)
    .values({ email: `turns-${randomUUID()}@example.com`, name: "Ana", passwordHash: "x" })
    .returning({ id: users.id });
  return user.id;
}

/** Inserts past turns, `agesMs` before now. */
async function pastTurns(userId: number, ...agesMs: number[]) {
  await db
    .insert(assistantTurns)
    .values(agesMs.map((age) => ({ userId, createdAt: new Date(Date.now() - age) })));
}

async function turnCount(userId: number) {
  return (await db.select().from(assistantTurns).where(eq(assistantTurns.userId, userId))).length;
}

describe("recordAssistantTurn", () => {
  it("records turns up to the limit, then refuses without recording", async () => {
    const userId = await newUser();
    expect(await recordAssistantTurn(userId, limits)).toEqual({ allowed: true });
    expect(await recordAssistantTurn(userId, limits)).toEqual({ allowed: true });

    const refused = await recordAssistantTurn(userId, limits);
    expect(refused.allowed).toBe(false);
    expect(await turnCount(userId)).toBe(2);
  });

  it("says how long until the oldest turn in the full window leaves it", async () => {
    const userId = await newUser();
    await pastTurns(userId, 4 * MINUTE, 1 * MINUTE);

    const result = await recordAssistantTurn(userId, limits);
    if (result.allowed) throw new Error("expected a refusal");
    // About 6 minutes; the margin covers the database and test clocks differing slightly.
    expect(result.retryAfterMs).toBeGreaterThan(6 * MINUTE - 5_000);
    expect(result.retryAfterMs).toBeLessThanOrEqual(6 * MINUTE + 5_000);
  });

  it("slides: turns older than the window do not count", async () => {
    const userId = await newUser();
    await pastTurns(userId, 11 * MINUTE, 1 * MINUTE);
    expect(await recordAssistantTurn(userId, limits)).toEqual({ allowed: true });
  });

  it("applies every limit, e.g. a daily cap on top of a short window", async () => {
    const userId = await newUser();
    const both = [
      { max: 2, windowMs: 10 * MINUTE },
      { max: 3, windowMs: DAY },
    ];
    await pastTurns(userId, 3 * 60 * MINUTE, 2 * 60 * MINUTE, 60 * MINUTE);

    const result = await recordAssistantTurn(userId, both);
    if (result.allowed) throw new Error("expected the daily cap to refuse");
    // The oldest turn of the day leaves it in about 21 hours.
    expect(result.retryAfterMs).toBeGreaterThan(21 * 60 * MINUTE - 5_000);
  });

  it("prunes the user's turns older than the longest window", async () => {
    const userId = await newUser();
    await pastTurns(userId, DAY + MINUTE, 2 * DAY, 30 * MINUTE);
    await recordAssistantTurn(userId, [{ max: 5, windowMs: DAY }]);
    expect(await turnCount(userId)).toBe(2);
  });

  it("keeps a separate count per user", async () => {
    const first = await newUser();
    const second = await newUser();
    await pastTurns(first, MINUTE, MINUTE);
    expect(await recordAssistantTurn(second, limits)).toEqual({ allowed: true });
    expect(await turnCount(first)).toBe(2);
  });

  it("lets only `max` of many concurrent turns through", async () => {
    const userId = await newUser();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => recordAssistantTurn(userId, limits)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(2);
    expect(await turnCount(userId)).toBe(2);
  });

  it("fails for a user that does not exist", async () => {
    await expect(recordAssistantTurn(2_000_000_000, limits)).rejects.toThrow("no user");
  });
});
