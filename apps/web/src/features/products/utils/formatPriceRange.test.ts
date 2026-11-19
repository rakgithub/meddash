import { describe, expect, it } from "vitest";
import { formatPriceRange } from "./formatPriceRange";

// Intl uses a non-breaking space before the euro sign.
const n = (s: string) => s.replace(/\s/g, " ");

describe("formatPriceRange", () => {
  it("says Price when no bound is set", () => {
    expect(formatPriceRange("", "")).toBe("Price");
  });

  it("shows both bounds", () => {
    expect(n(formatPriceRange("5", "7.5"))).toBe("5,00 € – 7,50 €");
  });

  it("shows only a minimum", () => {
    expect(n(formatPriceRange("5", ""))).toBe("From 5,00 €");
  });

  it("shows only a maximum", () => {
    expect(n(formatPriceRange("", "10"))).toBe("Up to 10,00 €");
  });
});
