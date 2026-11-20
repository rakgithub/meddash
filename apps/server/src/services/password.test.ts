import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse");
    expect(hash).toMatch(/^scrypt\$16384\$8\$5\$/);
    expect(hash).not.toContain("correct horse");
    expect(await verifyPassword("correct horse", hash)).toBe(true);
    expect(await verifyPassword("Correct horse", hash)).toBe(false);
  });

  it("salts each hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it.each(["", "bcrypt$x", "scrypt$1$2$3"])(
    "rejects a malformed stored hash %j",
    async (stored) => {
      expect(await verifyPassword("anything", stored)).toBe(false);
    },
  );
});
