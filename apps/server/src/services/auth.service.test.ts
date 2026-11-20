import { describe, expect, it, vi } from "vitest";
import { AppError } from "../errors/AppError.js";
import type { User } from "../schemas/auth.schema.js";
import { getCurrentUser, INVALID_CREDENTIALS, loginUser, registerUser } from "./auth.service.js";
import { hashPassword } from "./password.js";

const ana: User = { id: "1", email: "ana@example.com", name: "Ana", role: "customer" };

const rejection = (p: Promise<unknown>) => p.catch((e: unknown) => e);

describe("registerUser", () => {
  it("stores a hash, never the password, and returns the user", async () => {
    const insert = vi.fn().mockResolvedValue(ana);
    const user = await registerUser(
      { email: ana.email, name: ana.name, password: "secret123" },
      insert,
    );
    expect(user).toEqual(ana);
    const stored = insert.mock.calls[0]![0];
    expect(stored).toEqual({ email: ana.email, name: ana.name, passwordHash: expect.any(String) });
    expect(stored.passwordHash).not.toContain("secret123");
  });

  it("throws 409 when the email is taken", async () => {
    const err = await rejection(
      registerUser({ email: ana.email, name: "x", password: "secret123" }, async () => null),
    );
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ statusCode: 409 });
  });
});

describe("loginUser", () => {
  const find = async (email: string) =>
    email === ana.email ? { user: ana, passwordHash: await hashPassword("secret123") } : null;

  it("returns the user for the right password", async () => {
    expect(await loginUser({ email: ana.email, password: "secret123" }, find)).toEqual(ana);
  });

  it.each([
    ["a wrong password", { email: ana.email, password: "nope" }],
    ["an unknown email", { email: "who@example.com", password: "secret123" }],
  ])("gives the same 401 for %s", async (_label, input) => {
    const err = await rejection(loginUser(input, find));
    expect(err).toMatchObject({ statusCode: 401, message: INVALID_CREDENTIALS });
  });
});

describe("getCurrentUser", () => {
  it("returns the user", async () => {
    expect(await getCurrentUser(1, async () => ana)).toEqual(ana);
  });

  it("throws 401 when the account no longer exists", async () => {
    const err = await rejection(getCurrentUser(1, async () => null));
    expect(err).toMatchObject({ statusCode: 401 });
  });
});
