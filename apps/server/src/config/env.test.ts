import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

const url = "postgres://user:s3cret@localhost:5432/db";
const secret = "x".repeat(32);
const base = { DATABASE_URL: url, JWT_SECRET: secret };

describe("parseEnv", () => {
  it("reads PORT, DATABASE_URL and JWT_SECRET", () => {
    expect(parseEnv({ ...base, PORT: "4000" })).toEqual({
      port: 4000,
      databaseUrl: url,
      jwtSecret: secret,
      isProduction: false,
    });
  });

  it.each([undefined, ""])("defaults PORT to 3001 when it is %j", (PORT) => {
    expect(parseEnv({ ...base, PORT }).port).toBe(3001);
  });

  it.each([undefined, ""])("fails with a readable message when DATABASE_URL is %j", (v) => {
    expect(() => parseEnv({ ...base, DATABASE_URL: v })).toThrow(/DATABASE_URL is required/);
  });

  it.each(["0", "abc", "70000"])("rejects PORT=%s", (PORT) => {
    expect(() => parseEnv({ ...base, PORT })).toThrow(/PORT/);
  });

  it("never includes the URL (and its password) in the error", () => {
    const bad = "mysql://user:s3cret@localhost/db";
    expect(() => parseEnv({ ...base, DATABASE_URL: bad })).toThrow(
      /DATABASE_URL must be a postgres/,
    );
    expect(() => parseEnv({ ...base, DATABASE_URL: bad })).not.toThrow(/s3cret/);
  });

  it.each([undefined, ""])("requires JWT_SECRET when it is %j", (JWT_SECRET) => {
    expect(() => parseEnv({ ...base, JWT_SECRET })).toThrow(/JWT_SECRET is required/);
  });

  it("rejects a short JWT_SECRET without echoing it", () => {
    expect(() => parseEnv({ ...base, JWT_SECRET: "tooshort" })).toThrow(
      /JWT_SECRET must be at least 32/,
    );
    expect(() => parseEnv({ ...base, JWT_SECRET: "tooshort" })).not.toThrow(/tooshort/);
  });

  it("flags production from NODE_ENV", () => {
    expect(parseEnv({ ...base, NODE_ENV: "production" }).isProduction).toBe(true);
    expect(parseEnv({ ...base, NODE_ENV: "test" }).isProduction).toBe(false);
  });

  it("rejects an unknown NODE_ENV", () => {
    expect(() => parseEnv({ ...base, NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
