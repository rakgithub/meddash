import { describe, expect, it, vi } from "vitest";
import type { Product } from "../schemas/product.schema.js";
import type { SearchQuery } from "../schemas/search.schema.js";
import { pageOffset, searchProducts, splitTerms } from "./search.service.js";

const make = (id: string): Product => ({
  id,
  name: `Product ${id}`,
  description: "generic",
  category: "cat-a",
  brand: "Brand A",
  price: 10,
});

const base: SearchQuery = { sort: "relevance", page: 1 };
const fakeFind = (rows: Product[], total: number) => vi.fn(async () => ({ rows, total }));

describe("splitTerms", () => {
  it("lower-cases and splits on any whitespace", () => {
    expect(splitTerms("Aspirin   TABLETS\t100")).toEqual(["aspirin", "tablets", "100"]);
  });

  it("returns no terms when q is missing", () => {
    expect(splitTerms(undefined)).toEqual([]);
  });
});

describe("pageOffset", () => {
  it.each([
    [1, 0],
    [2, 10],
    [1000, 9990],
  ])("page %i starts at row %i", (page, offset) => {
    expect(pageOffset(page)).toBe(offset);
  });
});

describe("searchProducts", () => {
  it("passes terms, filters, sort and the page window to the data source", async () => {
    const find = fakeFind([], 0);
    await searchProducts(
      {
        q: "Ibu Gel",
        category: "c",
        brand: "b",
        minPrice: 1,
        maxPrice: 9,
        sort: "price_asc",
        page: 3,
      },
      find,
    );
    expect(find).toHaveBeenCalledWith(
      { terms: ["ibu", "gel"], category: "c", brand: "b", minPrice: 1, maxPrice: 9 },
      "price_asc",
      { limit: 10, offset: 20 },
    );
  });

  it("returns the rows and pagination metadata", async () => {
    const rows = [make("1"), make("2")];
    expect(await searchProducts(base, fakeFind(rows, 25))).toEqual({
      items: rows,
      pagination: { page: 1, pageSize: 10, total: 25, totalPages: 3 },
    });
  });

  it("keeps the total for a page past the end", async () => {
    const r = await searchProducts({ ...base, page: 4 }, fakeFind([], 25));
    expect(r.items).toEqual([]);
    expect(r.pagination).toEqual({ page: 4, pageSize: 10, total: 25, totalPages: 3 });
  });

  it("reports zero pages when there are no results", async () => {
    const r = await searchProducts(base, fakeFind([], 0));
    expect(r.pagination.totalPages).toBe(0);
  });
});
