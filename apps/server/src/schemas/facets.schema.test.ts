import { describe, expect, it } from "vitest";
import { facetsQuerySchema } from "./search.schema.js";

describe("facetsQuerySchema", () => {
  it("takes the search filters, with nothing required", () => {
    expect(facetsQuerySchema.parse({})).toEqual({});
    expect(
      facetsQuerySchema.parse({
        q: " gel ",
        category: "skin-care",
        brand: "Eucerin",
        minPrice: "5",
      }),
    ).toEqual({ q: "gel", category: "skin-care", brand: "Eucerin", minPrice: 5 });
  });

  it("treats empty strings as not provided", () => {
    expect(facetsQuerySchema.parse({ q: "", category: " ", maxPrice: "" })).toEqual({});
  });

  it.each([
    [{ minPrice: "20", maxPrice: "5" }],
    [{ minPrice: "-1" }],
    [{ q: "x".repeat(101) }],
    [{ sort: "price_asc" }],
    [{ page: "2" }],
    [{ unknown: "1" }],
  ])("rejects %j", (input) => {
    expect(facetsQuerySchema.safeParse(input).success).toBe(false);
  });
});
