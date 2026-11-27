import { describe, expect, it } from "vitest";
import { loadRefusal } from "./hostGuard.js";

const local = "postgres://u:p@localhost:5433/meddash";
const remote = "postgres://u:p@ep-example.neon.tech/neondb";

describe("loadRefusal", () => {
  it("allows a local database without a confirmation", () => {
    expect(loadRefusal(local, undefined)).toBeUndefined();
    expect(loadRefusal("postgres://u:p@127.0.0.1/meddash", undefined)).toBeUndefined();
    expect(loadRefusal("postgres://u:p@[::1]/meddash", undefined)).toBeUndefined();
  });

  it("refuses a remote database without --confirm-host", () => {
    expect(loadRefusal(remote, undefined)).toMatch(
      /"ep-example.neon.tech" is not local .*--confirm-host ep-example.neon.tech/,
    );
  });

  it("refuses a remote database when --confirm-host names another host", () => {
    expect(loadRefusal(remote, "localhost")).toMatch(/does not match/);
  });

  it("allows a remote database when --confirm-host matches its host", () => {
    expect(loadRefusal(remote, "ep-example.neon.tech")).toBeUndefined();
  });
});
