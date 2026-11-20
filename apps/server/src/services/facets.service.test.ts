import { describe, expect, it, vi } from "vitest";
import { getFacets, priceBuckets } from "./facets.service.js";

describe("priceBuckets", () => {
  it("splits the spread into eight equal bands and counts each product once", () => {
    const buckets = priceBuckets([1, 2, 3, 4, 5, 6, 7, 8, 9]);

    expect(buckets).toHaveLength(8);
    expect(buckets[0]).toEqual({ from: 1, to: 2, count: 1 });
    expect(buckets.map((b) => b.count).reduce((a, b) => a + b)).toBe(9);
  });

  it("puts the highest price in the last band", () => {
    const buckets = priceBuckets([1, 9]);

    expect(buckets[7]).toEqual({ from: 8, to: 9, count: 1 });
  });

  it("rounds band edges to cents", () => {
    const buckets = priceBuckets([2.99, 18.5]);

    expect(buckets[0].from).toBe(2.99);
    expect(buckets[0].to).toBe(4.93);
    expect(buckets[7].to).toBe(18.5);
  });

  it("uses a single band when every product costs the same", () => {
    expect(priceBuckets([5, 5, 5])).toEqual([{ from: 5, to: 5, count: 3 }]);
  });
});

describe("getFacets", () => {
  it("asks for the filters, splitting the search text into terms", async () => {
    const find = vi.fn(async () => ({ categories: [], brands: [], prices: [] }));

    await getFacets({ q: "Hand Cream", category: "skin-care", minPrice: 2 }, find);

    expect(find).toHaveBeenCalledWith({
      terms: ["hand", "cream"],
      category: "skin-care",
      brand: undefined,
      minPrice: 2,
      maxPrice: undefined,
    });
  });

  it("returns the counts and the price spread", async () => {
    const find = async () => ({
      categories: [{ value: "vitamins", count: 2 }],
      brands: [{ value: "Abtei", count: 2 }],
      prices: [4, 12],
    });

    const result = await getFacets({}, find);

    expect(result.categories).toEqual([{ value: "vitamins", count: 2 }]);
    expect(result.brands).toEqual([{ value: "Abtei", count: 2 }]);
    expect(result.price).toMatchObject({ min: 4, max: 12 });
    expect(result.price?.buckets).toHaveLength(8);
  });

  it("has no price spread when nothing matches", async () => {
    const result = await getFacets({}, async () => ({ categories: [], brands: [], prices: [] }));

    expect(result).toEqual({ categories: [], brands: [], price: null });
  });
});
