import { describe, expect, it } from "vitest";
import {
  CATALOGUE_DESCRIPTION_MAX,
  escapeLike,
  searchCatalogue,
  shortDescription,
  toCatalogueItem,
  toProduct,
  toProductDetail,
} from "./products.repo.js";
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

describe("shortDescription", () => {
  it("keeps short text as it is", () => {
    expect(shortDescription("Soothing syrup")).toBe("Soothing syrup");
  });

  it("cuts long text at a word boundary and marks the cut", () => {
    expect(shortDescription("Soothing syrup for dry cough", 16)).toBe("Soothing syrup…");
  });

  it("cuts a single long word hard", () => {
    expect(shortDescription("a".repeat(20), 10)).toBe(`${"a".repeat(9)}…`);
  });

  it("never exceeds the default maximum", () => {
    const long = "word ".repeat(100);
    expect(shortDescription(long).length).toBeLessThanOrEqual(CATALOGUE_DESCRIPTION_MAX);
  });
});

describe("toCatalogueItem", () => {
  it("maps a row to the slim model view", () => {
    expect(toCatalogueItem(row)).toEqual({
      id: "7",
      name: "Cough Syrup",
      category: "cold-flu",
      description: "d",
      dosageForm: "Syrup",
      activeIngredients: ["Ivy leaf dry extract"],
      packSize: "200 ml",
      price: 9.9,
      requiresPrescription: true,
      warnings: "Contains sorbitol",
    });
  });
});

// Runs against the seeded test database (see src/test/global-setup.ts).
describe("searchCatalogue", () => {
  const ids = async (text: string, category?: string, limit = 10) =>
    (await searchCatalogue(text, { category, limit })).map((p) => p.id);

  it("finds products by a symptom word in the description, stemmed", async () => {
    expect(await ids("headache")).toEqual(["1"]);
    expect((await ids("fever")).sort()).toEqual(["1", "2"]);
  });

  it("finds products by active ingredient", async () => {
    expect(await ids("xylometazoline")).toEqual(["6"]);
  });

  it("ranks ingredient matches above description-only matches", async () => {
    // Cough Syrup has "dry" in an ingredient, Moisturising Cream only in its description.
    expect(await ids("dry")).toEqual(["7", "10"]);
  });

  it("supports web-search syntax such as or", async () => {
    expect((await ids("cough or headache")).sort()).toEqual(["1", "7"]);
  });

  it("filters by category, case-insensitively", async () => {
    expect(await ids("dry", "Skin-Care")).toEqual(["10"]);
  });

  it("returns prescription-only products, flagged", async () => {
    const [syrup] = await searchCatalogue("cough", { limit: 5 });
    expect(syrup).toMatchObject({ id: "7", requiresPrescription: true });
  });

  it("respects the limit", async () => {
    expect(await ids("pain")).toHaveLength(3);
    expect(await ids("pain", undefined, 2)).toHaveLength(2);
  });

  it("falls back to substring matching when full-text search finds nothing", async () => {
    expect(await ids("ibu")).toEqual(["1", "11"]);
    expect(await ids("ibu", "skin-care")).toEqual([]);
  });

  it("returns nothing for unknown words or empty text", async () => {
    expect(await ids("xyzzy")).toEqual([]);
    expect(await ids("   ")).toEqual([]);
  });

  it("returns only the slim model view", async () => {
    const [item] = await searchCatalogue("headache", { limit: 1 });
    expect(Object.keys(item).sort()).toEqual(Object.keys(toCatalogueItem(row)).sort());
  });
});
