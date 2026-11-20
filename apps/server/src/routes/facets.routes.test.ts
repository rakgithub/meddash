import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

const get = (qs = "") => request(app).get(`/search/facets${qs}`);
const counts = (items: { value: string; count: number }[]) =>
  Object.fromEntries(items.map((i) => [i.value, i.count]));

describe("GET /search/facets", () => {
  it("counts every category and brand, and gives the price spread", async () => {
    const res = await get();

    expect(res.status).toBe(200);
    expect(counts(res.body.categories)).toEqual({
      "cold-flu": 3,
      "pain-relief": 3,
      "skin-care": 3,
      vitamins: 3,
    });
    expect(counts(res.body.brands)).toMatchObject({ Nurofen: 2, Eucerin: 2, Abtei: 1 });
    expect(res.body.price).toMatchObject({ min: 2.99, max: 18.5 });
    const inBuckets = res.body.price.buckets.reduce(
      (sum: number, b: { count: number }) => sum + b.count,
      0,
    );
    expect(inBuckets).toBe(12);
  });

  it("keeps every category in view when one is picked, and narrows the brands", async () => {
    const res = await get("?category=pain-relief");

    expect(Object.keys(counts(res.body.categories))).toHaveLength(4);
    expect(counts(res.body.brands)).toEqual({ Nurofen: 2, Ratiopharm: 1 });
    expect(res.body.price).toMatchObject({ min: 2.99, max: 11.45 });
  });

  it("applies the price range to the counts but not to the price spread", async () => {
    const res = await get("?category=pain-relief&maxPrice=5");

    expect(counts(res.body.categories)).toEqual({
      "cold-flu": 1,
      "pain-relief": 1,
      "skin-care": 1,
    });
    expect(res.body.price).toMatchObject({ min: 2.99, max: 11.45 });
  });

  it("matches the search text", async () => {
    const res = await get("?q=ibuprofen");

    expect(counts(res.body.categories)).toEqual({ "pain-relief": 2 });
    expect(counts(res.body.brands)).toEqual({ Nurofen: 2 });
  });

  it("returns empty facets and no price spread when nothing matches", async () => {
    const res = await get("?q=zzz-no-such-product");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ categories: [], brands: [], price: null });
  });

  it.each([
    ["minPrice=20&maxPrice=5", "minPrice"],
    ["minPrice=-1", "minPrice"],
    [`q=${"x".repeat(101)}`, "q"],
    ["page=2", undefined],
    ["sort=price_asc", undefined],
  ])("rejects invalid query %j", async (qs, field) => {
    const res = await get(`?${qs}`);

    expect(res.status).toBe(400);
    if (field) expect(res.body.error.details[0].field).toBe(field);
  });
});
