import { describe, expect, it } from "vitest";
import { hasCatalogueParams } from "./hasCatalogueParams";

describe("hasCatalogueParams", () => {
  it.each(["q=ibu", "category=vitamins", "brand=Abtei", "minPrice=2", "maxPrice=9", "page=2"])(
    "is true for %s",
    (query) => {
      expect(hasCatalogueParams(new URLSearchParams(query))).toBe(true);
    },
  );

  it("is false without catalogue params", () => {
    expect(hasCatalogueParams(new URLSearchParams(""))).toBe(false);
    expect(hasCatalogueParams(new URLSearchParams("utm_source=mail"))).toBe(false);
  });
});
