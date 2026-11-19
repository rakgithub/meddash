import { describe, expect, it } from "vitest";
import { escapeLike, toProduct, toProductDetail } from "./products.repo.js";
import type { ProductRow } from "./schema.js";

const row: ProductRow = {
  id: 7,
  name: "Cough Syrup",
  description: "d",
  category: "cold-flu",
  brand: "Prospan",
  price: "9.90",
  imageUrl: "https://images.unsplash.com/photo-1?w=600",
  sku: "MD-0007",
  pzn: "04337311",
  packSize: "200 ml",
  dosageForm: "Syrup",
  activeIngredients: ["Ivy leaf dry extract"],
  usageInstructions: "5 ml 3 times a day",
  warnings: "Contains sorbitol",
  requiresPrescription: true,
  stockQuantity: 25,
  manufacturer: "Engelhard",
};

describe("escapeLike", () => {
  it("escapes %, _ and backslash", () => {
    expect(escapeLike(String.raw`50%_off\now`)).toBe(String.raw`50\%\_off\\now`);
  });

  it("leaves ordinary text alone", () => {
    expect(escapeLike("ibu 400")).toBe("ibu 400");
  });
});

describe("toProduct", () => {
  it("maps a row to the slim API shape with a string id and numeric price", () => {
    expect(toProduct(row)).toEqual({
      id: "7",
      name: "Cough Syrup",
      description: "d",
      category: "cold-flu",
      brand: "Prospan",
      price: 9.9,
      imageUrl: "https://images.unsplash.com/photo-1?w=600",
    });
  });

  it("keeps a missing image as null", () => {
    expect(toProduct({ ...row, imageUrl: null }).imageUrl).toBeNull();
  });

  it("drops columns that are not part of the list shape", () => {
    expect(Object.keys(toProduct(row))).toEqual([
      "id",
      "name",
      "description",
      "category",
      "brand",
      "price",
      "imageUrl",
    ]);
  });
});

describe("toProductDetail", () => {
  it("adds the detail fields to the slim shape", () => {
    expect(toProductDetail(row)).toEqual({
      ...toProduct(row),
      sku: "MD-0007",
      pzn: "04337311",
      packSize: "200 ml",
      dosageForm: "Syrup",
      activeIngredients: ["Ivy leaf dry extract"],
      usageInstructions: "5 ml 3 times a day",
      warnings: "Contains sorbitol",
      requiresPrescription: true,
      stockQuantity: 25,
      manufacturer: "Engelhard",
    });
  });

  it("keeps unknown optional fields as null", () => {
    const detail = toProductDetail({ ...row, sku: null, pzn: null, warnings: null });
    expect(detail).toMatchObject({ sku: null, pzn: null, warnings: null });
  });
});
