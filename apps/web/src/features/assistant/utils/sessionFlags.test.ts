import { describe, expect, it } from "vitest";
import {
  forgetIntroSeen,
  introSeen,
  markIntroSeen,
  savePendingMessage,
  takePendingMessage,
} from "./sessionFlags";

describe("sessionFlags", () => {
  it("remembers that the intro played until it is forgotten", () => {
    expect(introSeen()).toBe(false);
    markIntroSeen();
    expect(introSeen()).toBe(true);
    forgetIntroSeen();
    expect(introSeen()).toBe(false);
  });

  it("hands out a pending message only once", () => {
    savePendingMessage("Itchy eyes");
    expect(takePendingMessage()).toBe("Itchy eyes");
    expect(takePendingMessage()).toBeNull();
  });

  it("ignores a blank pending message", () => {
    savePendingMessage("   ");
    expect(takePendingMessage()).toBeNull();
  });
});
