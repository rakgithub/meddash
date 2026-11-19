import { describe, expect, it } from "vitest";
import { suggestQuerySchema } from "./suggest.schema.js";

describe("suggestQuerySchema", () => {
  it("trims q", () => {
    expect(suggestQuerySchema.parse({ q: "  ibu " })).toEqual({ q: "ibu" });
  });

  it("accepts a 100 character q", () => {
    expect(suggestQuerySchema.safeParse({ q: "x".repeat(100) }).success).toBe(true);
  });

  it.each([
    [{}],
    [{ q: "" }],
    [{ q: "   " }],
    [{ q: "x".repeat(101) }],
    [{ q: ["a", "b"] }],
    [{ q: "a", limit: "10" }],
  ])("rejects %j", (input) => {
    expect(suggestQuerySchema.safeParse(input).success).toBe(false);
  });
});
