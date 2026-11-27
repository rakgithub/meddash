import { describe, expect, it } from "vitest";
import { brands } from "./brands.js";
import { generateCatalogue, hash, priceFor, roundPrice, seededRandom, skuFor } from "./generate.js";
import { imageUrlFor } from "./images.js";
import { productTypes, type Form } from "./productTypes.js";
import { validateCatalogue } from "./validate.js";

const catalogue = generateCatalogue();

describe("generateCatalogue", () => {
  it("makes 1,000 products over 12 categories, with many different descriptions", () => {
    expect(catalogue).toHaveLength(1000);
    expect(new Set(catalogue.map((p) => p.category)).size).toBe(12);
    // Photos repeat; what the assistant reads (descriptions) should not.
    expect(new Set(catalogue.map((p) => p.description)).size).toBeGreaterThan(100);
    expect(new Set(catalogue.map((p) => p.imageUrl)).size).toBeLessThan(30);
  });

  it("makes the same products on two runs", () => {
    expect(generateCatalogue()).toEqual(catalogue);
  });

  it("gives every product a unique SKU", () => {
    expect(new Set(catalogue.map((p) => p.sku)).size).toBe(catalogue.length);
  });

  it("makes products that pass the API's detail schema", () => {
    expect(validateCatalogue(catalogue)).toEqual([]);
  });

  it("gives every product an image, with no PZN", () => {
    for (const p of catalogue) {
      expect(p.imageUrl).toMatch(/^https:\/\/images\.unsplash\.com\/photo-/);
      expect(p.pzn).toBeNull();
    }
  });

  it("covers every category of the product types", () => {
    const wanted = new Set(productTypes.map((t) => t.category));
    expect(new Set(catalogue.map((p) => p.category))).toEqual(wanted);
  });

  it("spreads over most brands and keeps the seed's SKU namespace free", () => {
    // Brands are picked at random per combination, so a small catalogue may miss one or two.
    expect(new Set(catalogue.map((p) => p.brand)).size).toBeGreaterThanOrEqual(brands.length - 5);
    expect(catalogue.some((p) => /^MD-\d+$/.test(p.sku))).toBe(false);
  });

  it("stops at the target, spread over categories", () => {
    const small = generateCatalogue(100);
    expect(small).toHaveLength(100);
    expect(new Set(small.map((p) => p.category)).size).toBeGreaterThan(1);
  });

  it("names products brand, ingredient, strength, form", () => {
    const product = catalogue.find((p) => p.sku.startsWith("MD-IBU-400-TAB-20-"));
    expect(product?.name).toBe(`${product?.brand} Ibuprofen 400 mg film-coated tablets`);
    expect(product?.activeIngredients).toEqual(["Ibuprofen 400 mg"]);
    expect(product?.packSize).toBe("20 tablets");
  });

  it("marks about 5 % of products out of stock", () => {
    const outOfStock = catalogue.filter((p) => p.stockQuantity === 0).length;
    expect(outOfStock / catalogue.length).toBeGreaterThan(0.01);
    expect(outOfStock / catalogue.length).toBeLessThan(0.1);
    expect(Math.max(...catalogue.map((p) => p.stockQuantity))).toBeLessThanOrEqual(300);
  });

  it("keeps existing SKUs and products when a product type is added", () => {
    const [extra, ...rest] = productTypes;
    const without = generateCatalogue(Infinity, rest);
    const withExtra = generateCatalogue(Infinity, [extra, ...rest]);
    const bySku = new Map(withExtra.map((p) => [p.sku, p]));
    for (const p of without) expect(bySku.get(p.sku)).toEqual(p);
    expect(withExtra.length).toBeGreaterThan(without.length);
  });
});

describe("table codes", () => {
  it("are unique, because SKUs are built from them", () => {
    expect(new Set(brands.map((b) => b.code)).size).toBe(brands.length);
    expect(new Set(productTypes.map((t) => t.code)).size).toBe(productTypes.length);
    for (const type of productTypes) {
      expect(new Set(type.forms.map((f) => f.code)).size).toBe(type.forms.length);
    }
  });
});

describe("skuFor", () => {
  const type = productTypes[0];
  const form = type.forms[0];

  it("builds the SKU from the combination", () => {
    expect(skuFor(type, form, "400 mg", 20, brands[0])).toBe("MD-IBU-400-TAB-20-MEDI");
  });

  it("encodes decimals and missing strengths", () => {
    expect(skuFor(type, form, "0.05 %", 10, brands[0])).toBe("MD-IBU-0P05-TAB-10-MEDI");
    expect(skuFor(type, form, "", 10, brands[0])).toBe("MD-IBU-X-TAB-10-MEDI");
  });
});

describe("price", () => {
  const form: Form = { ...productTypes[0].forms[0], basePrice: 4, packs: [10, 20, 50] };

  it("is higher for premium than standard than budget", () => {
    const [budget, standard, premium] = (["budget", "standard", "premium"] as const).map((tier) =>
      priceFor(form, 0, 20, tier),
    );
    expect(budget).toBeLessThan(standard);
    expect(standard).toBeLessThan(premium);
  });

  it("grows with pack size and strength", () => {
    expect(priceFor(form, 0, 10, "standard")).toBeLessThan(priceFor(form, 0, 50, "standard"));
    expect(priceFor(form, 0, 20, "standard")).toBeLessThan(priceFor(form, 1, 20, "standard"));
  });

  it("makes a bigger pack cheaper per unit", () => {
    expect(priceFor(form, 0, 50, "standard") / 50).toBeLessThan(
      priceFor(form, 0, 10, "standard") / 10,
    );
  });

  it("is positive with a .49 or .99 ending for every generated product", () => {
    for (const { price } of catalogue) {
      expect(price).toBeGreaterThan(0);
      expect([0.49, 0.99]).toContain(Number((price % 1).toFixed(2)));
    }
  });

  it("rounds to the nearest shelf price", () => {
    expect(roundPrice(4.1)).toBe(3.99);
    expect(roundPrice(4.3)).toBe(4.49);
    expect(roundPrice(4.8)).toBe(4.99);
    expect(roundPrice(0.1)).toBe(0.49);
  });
});

describe("seededRandom", () => {
  it("repeats for the same seed and differs for another", () => {
    const a = seededRandom("x");
    const b = seededRandom("x");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seededRandom("y")()).not.toBe(seededRandom("x")());
  });

  it("stays in [0, 1)", () => {
    const random = seededRandom("range");
    for (let i = 0; i < 1000; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("imageUrlFor", () => {
  it("uses the most specific key that has photos", () => {
    // No "ibuprofen-gel" photos, so it falls back to the category and form.
    expect(imageUrlFor("ibuprofen", "pain-relief", "gel", 0)).toContain("1576602976047");
  });

  it("falls back to any photo of the category for an unknown form", () => {
    expect(imageUrlFor("x", "cold-flu", "no-such-form", 0)).toMatch(/images\.unsplash\.com/);
  });

  it("picks between several photos by hash", () => {
    const urls = new Set([0, 1].map((h) => imageUrlFor("x", "pain-relief", "tablet", h)));
    expect(urls.size).toBe(2);
    expect(hash("a")).toBe(hash("a"));
  });

  it("reuses photos of the same form for a category with none of its own", () => {
    expect(imageUrlFor("x", "allergy", "tablet", 0)).toMatch(/images\.unsplash\.com/);
  });

  it("throws when no category has a photo of that form", () => {
    expect(() => imageUrlFor("x", "allergy", "no-such-form", 0)).toThrow(/No photo/);
  });
});
