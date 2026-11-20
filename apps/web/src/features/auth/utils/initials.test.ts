import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it.each([
    ["Ana Weber", "AW"],
    ["Cher", "C"],
    ["Maria von Trapp", "MT"],
    ["  ana   weber  ", "AW"],
    ["", "?"],
    ["   ", "?"],
    ["😀 Smile", "😀S"],
    ["𝒜lice Doe", "𝒜D"],
  ])("%j → %j", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
