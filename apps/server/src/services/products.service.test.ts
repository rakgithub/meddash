import { describe, expect, it } from "vitest";
import { AppError } from "../errors/AppError.js";
import type { Product, ProductDetail } from "../schemas/product.schema.js";
import { getProduct, listProducts } from "./products.service.js";

const p = (id: string): Product => ({
  id,
  name: `P${id}`,
  description: "d",
  category: "c",
  brand: "b",
  price: 1,
  imageUrl: null,
});

const detail: ProductDetail = {
  ...p("1"),
  sku: null,
  pzn: null,
  packSize: null,
  dosageForm: null,
  activeIngredients: [],
  usageInstructions: null,
  warnings: null,
  requiresPrescription: false,
  stockQuantity: 0,
  manufacturer: null,
};

describe("listProducts", () => {
  it("returns every product with a total", async () => {
    const data = [p("1"), p("2"), p("3")];
    expect(await listProducts(async () => data)).toEqual({ items: data, total: 3 });
  });

  it("returns an empty list for an empty source", async () => {
    expect(await listProducts(async () => [])).toEqual({ items: [], total: 0 });
  });
});

describe("getProduct", () => {
  it("returns the product the source finds, looked up by id", async () => {
    const ids: number[] = [];
    const found = await getProduct(1, async (id) => {
      ids.push(id);
      return detail;
    });
    expect(found).toBe(detail);
    expect(ids).toEqual([1]);
  });

  it("throws a 404 AppError when there is no such product", async () => {
    const err = await getProduct(99, async () => null).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ statusCode: 404, message: "Product not found" });
  });
});
