import { describe, expect, it } from "vitest";
import type { Product } from "../schemas/product.schema.js";
import { listProducts } from "./products.service.js";

const p = (id: string): Product => ({
  id,
  name: `P${id}`,
  description: "d",
  category: "c",
  brand: "b",
  price: 1,
  imageUrl: null,
});

describe("listProducts", () => {
  it("returns every product with a total", async () => {
    const data = [p("1"), p("2"), p("3")];
    expect(await listProducts(async () => data)).toEqual({ items: data, total: 3 });
  });

  it("returns an empty list for an empty source", async () => {
    expect(await listProducts(async () => [])).toEqual({ items: [], total: 0 });
  });
});
