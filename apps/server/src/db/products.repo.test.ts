import { describe, expect, it } from "vitest";
import { escapeLike, toProduct } from "./products.repo.js";

describe("escapeLike", () => {
  it("escapes %, _ and backslash", () => {
    expect(escapeLike(String.raw`50%_off\now`)).toBe(String.raw`50\%\_off\\now`);
  });

  it("leaves ordinary text alone", () => {
    expect(escapeLike("ibu 400")).toBe("ibu 400");
  });
});

describe("toProduct", () => {
  it("maps a row to the API shape with a string id and numeric price", () => {
    const row = {
      id: 7,
      name: "Cough Syrup",
      description: "d",
      category: "cold-flu",
      brand: "Prospan",
      price: "9.90",
      imageUrl: "https://images.unsplash.com/photo-1?w=600",
    };
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
    const row = {
      id: 1,
      name: "n",
      description: "d",
      category: "c",
      brand: "b",
      price: "1.00",
      imageUrl: null,
    };
    expect(toProduct(row).imageUrl).toBeNull();
  });

  it("drops columns that are not part of the API shape", () => {
    const row = {
      id: 1,
      name: "n",
      description: "d",
      category: "c",
      brand: "b",
      price: "1.00",
      imageUrl: null,
      internal: "x",
    };
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
