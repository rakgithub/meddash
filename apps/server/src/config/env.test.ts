import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

const url = "postgres://user:s3cret@localhost:5432/db";

describe("parseEnv", () => {
  it("reads PORT and DATABASE_URL", () => {
    expect(parseEnv({ PORT: "4000", DATABASE_URL: url })).toEqual({
      port: 4000,
      databaseUrl: url,
    });
  });

  it.each([undefined, ""])("defaults PORT to 3001 when it is %j", (PORT) => {
    expect(parseEnv({ PORT, DATABASE_URL: url }).port).toBe(3001);
  });

  it.each([undefined, ""])("fails with a readable message when DATABASE_URL is %j", (v) => {
    expect(() => parseEnv({ DATABASE_URL: v })).toThrow(/DATABASE_URL is required/);
  });

  it.each(["0", "abc", "70000"])("rejects PORT=%s", (PORT) => {
    expect(() => parseEnv({ PORT, DATABASE_URL: url })).toThrow(/PORT/);
  });

  it("never includes the URL (and its password) in the error", () => {
    const bad = "mysql://user:s3cret@localhost/db";
    expect(() => parseEnv({ DATABASE_URL: bad })).toThrow(/DATABASE_URL must be a postgres/);
    expect(() => parseEnv({ DATABASE_URL: bad })).not.toThrow(/s3cret/);
  });
});
