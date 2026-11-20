import { describe, expect, it } from "vitest";
import { dosageFormKind } from "./dosageFormKind";

describe("dosageFormKind", () => {
  it.each([
    ["Film-coated tablet", "tablet"],
    ["Capsule", "tablet"],
    ["Lozenge", "tablet"],
    ["Syrup", "liquid"],
    ["Nasal spray", "spray"],
    ["Cream", "cream"],
    ["Gel", "cream"],
    ["Lotion", "cream"],
  ])("%s -> %s", (form, kind) => {
    expect(dosageFormKind(form)).toBe(kind);
  });

  it("has no icon for an unknown or missing form", () => {
    expect(dosageFormKind("Powder")).toBeNull();
    expect(dosageFormKind(null)).toBeNull();
  });
});
