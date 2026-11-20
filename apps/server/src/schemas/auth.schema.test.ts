import { describe, expect, it } from "vitest";
import { loginBodySchema, registerBodySchema } from "./auth.schema.js";

const valid = { email: "ana@example.com", password: "longenough", name: "Ana" };

describe("registerBodySchema", () => {
  it("trims and lower-cases the email and trims the name", () => {
    const parsed = registerBodySchema.parse({
      ...valid,
      email: "  Ana@Example.COM ",
      name: " Ana ",
    });
    expect(parsed).toEqual({ email: "ana@example.com", password: "longenough", name: "Ana" });
  });

  it("keeps spaces in the password", () => {
    expect(registerBodySchema.parse({ ...valid, password: " pass word " }).password).toBe(
      " pass word ",
    );
  });

  it.each([
    ["an invalid email", { email: "not-an-email" }, "email"],
    ["a short password", { password: "short" }, "password"],
    ["a very long password", { password: "x".repeat(129) }, "password"],
    ["a blank name", { name: "   " }, "name"],
    ["a missing name", { name: undefined }, "name"],
  ])("rejects %s", (_label, override, field) => {
    const result = registerBodySchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([field]);
  });

  it("rejects unknown keys such as role", () => {
    expect(registerBodySchema.safeParse({ ...valid, role: "admin" }).success).toBe(false);
  });
});

describe("loginBodySchema", () => {
  it("accepts any non-empty password", () => {
    expect(loginBodySchema.safeParse({ email: "a@b.de", password: "x" }).success).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(loginBodySchema.safeParse({ email: "a@b.de", password: "" }).success).toBe(false);
  });
});
