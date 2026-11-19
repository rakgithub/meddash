import { describe, expect, it } from "vitest";
import { formatStock } from "./formatStock";

describe("formatStock", () => {
  it("says out of stock at zero", () => {
    expect(formatStock(0)).toBe("Out of stock");
  });

  it("shows the remaining count when stock is low", () => {
    expect(formatStock(1)).toBe("Only 1 left");
    expect(formatStock(5)).toBe("Only 5 left");
  });

  it("says in stock above the low-stock threshold", () => {
    expect(formatStock(6)).toBe("In stock");
  });
});
