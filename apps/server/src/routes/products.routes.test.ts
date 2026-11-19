import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

describe("GET /products", () => {
  it("returns all products with a total", async () => {
    const res = await request(app).get("/products");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(12);
    expect(res.body.items).toHaveLength(12);
    expect(res.body.items[0]).toEqual({
      id: "1",
      name: "Ibuprofen 400mg",
      description: expect.any(String),
      category: "pain-relief",
      brand: "Nurofen",
      price: 6.49,
      imageUrl: expect.stringMatching(/^https:\/\/images\.unsplash\.com\//),
    });
  });

  it("gives every seeded product its own image", async () => {
    const res = await request(app).get("/products");
    const urls = res.body.items.map((p: { imageUrl: string | null }) => p.imageUrl);
    expect(urls.every((u: string | null) => u !== null)).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("is not limited to one page, unlike /search", async () => {
    const [all, search] = await Promise.all([
      request(app).get("/products"),
      request(app).get("/search"),
    ]);
    expect(all.body.items.length).toBeGreaterThan(search.body.items.length);
  });
});

describe("GET /products/:id", () => {
  it("returns the full detail shape", async () => {
    const res = await request(app).get("/products/1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "1",
      name: "Ibuprofen 400mg",
      description: expect.any(String),
      category: "pain-relief",
      brand: "Nurofen",
      price: 6.49,
      imageUrl: expect.stringMatching(/^https:\/\/images\.unsplash\.com\//),
      sku: "MD-0001",
      pzn: "04875159",
      packSize: "20 tablets",
      dosageForm: "Film-coated tablet",
      activeIngredients: ["Ibuprofen 400 mg"],
      usageInstructions: expect.any(String),
      warnings: expect.any(String),
      requiresPrescription: false,
      stockQuantity: 120,
      manufacturer: "Reckitt",
    });
  });

  it("flags prescription-only products", async () => {
    const res = await request(app).get("/products/7");
    expect(res.body.requiresPrescription).toBe(true);
  });

  it("reports an out-of-stock product with a zero quantity", async () => {
    const res = await request(app).get("/products/12");
    expect(res.body.stockQuantity).toBe(0);
  });

  it("keeps the list and search on the slim shape", async () => {
    const [list, search] = await Promise.all([
      request(app).get("/products"),
      request(app).get("/search"),
    ]);
    expect(list.body.items[0]).not.toHaveProperty("sku");
    expect(search.body.items[0]).not.toHaveProperty("sku");
  });

  it("returns 404 for an id that does not exist", async () => {
    const res = await request(app).get("/products/9999");
    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe("Product not found");
  });

  it.each(["abc", "0", "-1", "1.5", "2147483648"])("returns 400 for id %s", async (id) => {
    const res = await request(app).get(`/products/${id}`);
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: "id", message: expect.any(String) }]);
  });
});
