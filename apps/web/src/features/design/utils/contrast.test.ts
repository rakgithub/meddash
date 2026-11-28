import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white, whichever way round", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(21);
  });

  it("is 1 for a colour on itself", () => {
    expect(contrastRatio("#5fd4bf", "#5FD4BF")).toBe(1);
  });

  it("matches the ratio the plan checked for white on teal-700", () => {
    expect(contrastRatio("#ffffff", "#0f766e")).toBeCloseTo(5.47, 1);
  });

  it("returns null for anything that is not a hex colour", () => {
    expect(contrastRatio("color-mix(in srgb, red 50%, blue)", "#fff")).toBeNull();
    expect(contrastRatio("#fff", "var(--ink-950)")).toBeNull();
    expect(contrastRatio("#12345", "#fff")).toBeNull();
  });
});
