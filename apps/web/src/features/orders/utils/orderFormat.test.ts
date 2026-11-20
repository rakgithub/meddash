import { describe, expect, it } from "vitest";
import { formatOrderDate, itemLabel, statusLabel } from "./orderFormat";

describe("orderFormat", () => {
  it.each([
    ["pending_payment", "Awaiting payment"],
    ["paid", "Paid"],
    ["failed", "Payment failed"],
    ["cancelled", "Cancelled"],
  ] as const)("labels %s", (status, label) => {
    expect(statusLabel(status)).toBe(label);
  });

  it("formats a date", () => {
    expect(formatOrderDate("2026-11-20T12:00:00.000Z")).toBe("20.11.2026");
  });

  it("pluralises items", () => {
    expect(itemLabel(1)).toBe("1 item");
    expect(itemLabel(3)).toBe("3 items");
  });
});
