import { describe, expect, it } from "vitest";
import { seedRefusal } from "./seedGuard.js";

const local = "postgres://u:p@localhost:5433/meddash";
const remote = "postgres://u:p@ep-example.neon.tech/neondb";

describe("seedRefusal", () => {
  it("allows a local database", () => {
    expect(seedRefusal({}, local)).toBeUndefined();
    expect(seedRefusal({}, "postgres://u:p@127.0.0.1/meddash")).toBeUndefined();
    expect(seedRefusal({}, "postgres://u:p@[::1]/meddash")).toBeUndefined();
  });

  it("refuses a remote database without the opt-in", () => {
    expect(seedRefusal({}, remote)).toMatch(/"ep-example.neon.tech" is not local/);
    expect(seedRefusal({ ALLOW_REMOTE_SEED: "true" }, remote)).toMatch(/is not local/);
  });

  it("allows a remote database with ALLOW_REMOTE_SEED=1", () => {
    expect(seedRefusal({ ALLOW_REMOTE_SEED: "1" }, remote)).toBeUndefined();
  });

  it("always refuses in production, even with the opt-in", () => {
    expect(seedRefusal({ NODE_ENV: "production" }, local)).toBe("NODE_ENV=production");
    expect(seedRefusal({ NODE_ENV: "production", ALLOW_REMOTE_SEED: "1" }, remote)).toBe(
      "NODE_ENV=production",
    );
  });
});
