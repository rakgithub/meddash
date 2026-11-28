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
      anthropicApiKey: undefined,
      assistantModel: "claude-haiku-5-5",
      opensearch: undefined,
    });
  });

  describe("OpenSearch", () => {
    const opensearch = {
      OPENSEARCH_URL: "https://search.example.com:9200",
      OPENSEARCH_USERNAME: "meddash",
      OPENSEARCH_PASSWORD: "os-s3cret",
    };

    it("reads the URL and credentials together", () => {
      expect(parseEnv({ ...base, ...opensearch }).opensearch).toEqual({
        url: "https://search.example.com:9200",
        username: "meddash",
        password: "os-s3cret",
      });
    });

    it.each([undefined, ""])("is off when OPENSEARCH_URL is %j", (url) => {
      expect(parseEnv({ ...base, ...opensearch, OPENSEARCH_URL: url }).opensearch).toBeUndefined();
    });

    it.each(["OPENSEARCH_USERNAME", "OPENSEARCH_PASSWORD"])("requires %s with a URL", (key) => {
      expect(() => parseEnv({ ...base, ...opensearch, [key]: "" })).toThrow(
        new RegExp(`${key} is required when OPENSEARCH_URL is set`),
      );
    });

    it.each(["search.example.com:9200", "https://admin:pw@search.example.com"])(
      "rejects OPENSEARCH_URL=%s without echoing it",
      (url) => {
        const parse = () => parseEnv({ ...base, ...opensearch, OPENSEARCH_URL: url });
        expect(parse).toThrow(/OPENSEARCH_URL must be an http/);
        expect(parse).not.toThrow(/pw@/);
      },
    );

    it("never echoes OPENSEARCH_PASSWORD when another variable is invalid", () => {
      expect(() => parseEnv({ ...base, ...opensearch, PORT: "abc" })).not.toThrow(/os-s3cret/);
    });
  });

  it.each([undefined, ""])("starts without ANTHROPIC_API_KEY when it is %j", (key) => {
    expect(parseEnv({ ...base, ANTHROPIC_API_KEY: key }).anthropicApiKey).toBeUndefined();
  });

  it("reads ANTHROPIC_API_KEY when set", () => {
    expect(parseEnv({ ...base, ANTHROPIC_API_KEY: "sk-test" }).anthropicApiKey).toBe("sk-test");
  });

  it.each([undefined, ""])("defaults ASSISTANT_MODEL to Haiku when it is %j", (model) => {
    expect(parseEnv({ ...base, ASSISTANT_MODEL: model }).assistantModel).toBe("claude-haiku-5-5");
  });

  it("reads ASSISTANT_MODEL when set", () => {
    expect(parseEnv({ ...base, ASSISTANT_MODEL: "claude-sonnet-5-5" }).assistantModel).toBe(
      "claude-sonnet-5-5",
    );
  });

  it("never echoes ANTHROPIC_API_KEY when another variable is invalid", () => {
    expect(() => parseEnv({ ...base, ANTHROPIC_API_KEY: "sk-secret", PORT: "abc" })).not.toThrow(
      /sk-secret/,
    );
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
