import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { pool } from "../db/client.js";

afterEach(() => vi.restoreAllMocks());

const ids = (res: request.Response) => res.body.items.map((p: { id: string }) => p.id);
const names = (res: request.Response) => res.body.items.map((p: { name: string }) => p.name);

const app = createApp();

describe("GET /search", () => {
  it("returns the first page of all products with no params", async () => {
    const res = await request(app).get("/search");
    expect(res.status).toBe(200);
    expect(res.body.pagination).toEqual({ page: 1, pageSize: 10, total: 12, totalPages: 2 });
    expect(res.body.items).toHaveLength(10);
  });

  it("treats empty params as not provided", async () => {
    const res = await request(app).get("/search?q=&category=&brand=&minPrice=&sort=&page=");
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(12);
  });

  it("filters by q, ranking name matches first", async () => {
    const res = await request(app).get("/search?q=ibuprofen");
    expect(ids(res)).toEqual(["1", "11"]);
  });

  it("filters by category, brand (case-insensitive) and minPrice", async () => {
    const res = await request(app).get("/search?category=Skin-Care&brand=eucerin&minPrice=15");
    expect(ids(res)).toEqual(["9"]);
  });

  it("filters by a price range", async () => {
    const res = await request(app).get("/search?minPrice=5&maxPrice=7");
    const prices = res.body.items.map((p: { price: number }) => p.price);
    expect(prices.length).toBeGreaterThan(0);
    expect(prices.every((p: number) => p >= 5 && p <= 7)).toBe(true);
  });

  it("sorts by price", async () => {
    const res = await request(app).get("/search?category=vitamins&sort=price_desc");
    const prices = res.body.items.map((p: { price: number }) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  it("paginates", async () => {
    const res = await request(app).get("/search?page=2");
    expect(ids(res)).toEqual(["11", "12"]);
  });

  it("keeps the total for a page past the last result", async () => {
    const res = await request(app).get("/search?page=3");
    expect(res.body.items).toEqual([]);
    expect(res.body.pagination).toEqual({ page: 3, pageSize: 10, total: 12, totalPages: 2 });
  });

  it("ranks by summed relevance across terms, ties in catalogue order", async () => {
    // 4 matches both terms in its name; 3 matches "c" only in its description.
    const res = await request(app).get("/search?q=vitamin%20c");
    expect(ids(res)).toEqual(["4", "3"]);
  });

  it("requires every term to match", async () => {
    const res = await request(app).get("/search?q=ibuprofen%20gel");
    expect(ids(res)).toEqual(["11"]);
  });

  it("matches brand and description, case-insensitively", async () => {
    expect(ids(await request(app).get("/search?q=EUCERIN"))).toEqual(["9", "10"]);
    expect(ids(await request(app).get("/search?q=cracked"))).toEqual(["12"]);
  });

  it.each(["%", "_", "\\"])("treats %j in q literally, not as a wildcard", async (q) => {
    const res = await request(app).get(`/search?q=${encodeURIComponent(q)}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(0);
  });

  it("sorts by price ascending, ties in catalogue order", async () => {
    const res = await request(app).get("/search?sort=price_asc&page=1");
    const prices = res.body.items.map((p: { price: number }) => p.price);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
    expect(prices[0]).toBe(2.99);
  });

  it.each([
    ["name_asc", 1],
    ["name_desc", -1],
  ] as const)("sorts by %s on lower-cased name, byte order", async (sort, dir) => {
    const [page1, page2] = await Promise.all([
      request(app).get(`/search?sort=${sort}`),
      request(app).get(`/search?sort=${sort}&page=2`),
    ]);
    const all = [...names(page1), ...names(page2)].map((n: string) => n.toLowerCase());
    expect(all).toEqual([...all].sort((a, b) => dir * (a < b ? -1 : a > b ? 1 : 0)));
  });

  it("returns 500 without internals when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(pool, "query").mockRejectedValue(new Error("connection refused"));
    const res = await request(app).get("/search?q=ibu");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { message: "Internal server error" } });
  });

  it.each([
    ["minPrice=-1", "minPrice"],
    ["minPrice=abc", "minPrice"],
    ["maxPrice=-1", "maxPrice"],
    ["minPrice=20&maxPrice=5", "minPrice"],
    ["page=0", "page"],
    ["page=1.5", "page"],
    ["sort=random", "sort"],
    ["q=a&q=b", "q"],
    [`q=${"x".repeat(101)}`, "q"],
  ])("rejects invalid %s", async (qs, field) => {
    const res = await request(app).get(`/search?${qs}`);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe(field);
  });

  it("rejects unknown query params", async () => {
    const res = await request(app).get("/search?color=red");
    expect(res.status).toBe(400);
  });
});
