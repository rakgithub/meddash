import { describe, expect, it } from "vitest";
import { buildSearchParams } from "./buildSearchParams";
import { parseSearchParams } from "./parseSearchParams";
import { EMPTY_FILTERS } from "../types";

describe("parseSearchParams", () => {
  it("returns empty filters and page 1 for no params", () => {
    expect(parseSearchParams(new URLSearchParams())).toEqual({ filters: EMPTY_FILTERS, page: 1 });
  });

  it("reads every filter and the page", () => {
    const params = new URLSearchParams(
      "q=ibu&category=pain-relief&brand=Nurofen&minPrice=5&maxPrice=20&page=2",
    );
    expect(parseSearchParams(params)).toEqual({
      filters: {
        q: "ibu",
        category: "pain-relief",
        brand: "Nurofen",
        minPrice: "5",
        maxPrice: "20",
      },
      page: 2,
    });
  });

  it("ignores unknown params", () => {
    expect(parseSearchParams(new URLSearchParams("foo=bar")).filters).toEqual(EMPTY_FILTERS);
  });

  it.each(["0", "-1", "1.5", "abc", ""])("falls back to page 1 for page=%j", (page) => {
    expect(parseSearchParams(new URLSearchParams({ page })).page).toBe(1);
  });

  it("round-trips with buildSearchParams", () => {
    const filters = { ...EMPTY_FILTERS, q: "vitamin d", minPrice: "3" };
    expect(parseSearchParams(buildSearchParams(filters, 3))).toEqual({ filters, page: 3 });
  });
});
