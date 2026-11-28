import { describe, expect, it } from "vitest";
import type { ProductRow } from "../db/schema.js";
import { productIndexBody, toSearchDocument } from "./productIndex.js";

const row: ProductRow = {
  id: 42,
  name: "Ibuprofen 400 mg",
  description: "Relieves pain and fever.",
  category: "Pain Relief",
  brand: "Acme",
  price: "4.99",
  imageUrl: "https://img.example.com/42.png",
  sku: "SKU-42",
  pzn: "01234567",
  packSize: "20 tablets",
  dosageForm: "tablet",
  activeIngredients: ["ibuprofen"],
  usageInstructions: "One tablet up to three times a day.",
  warnings: "Not for children under 12.",
  requiresPrescription: false,
  stockQuantity: 7,
  manufacturer: "Acme Pharma",
};

describe("toSearchDocument", () => {
  it("maps the searchable and filterable fields, with price as a number", () => {
    expect(toSearchDocument(row)).toEqual({
      id: 42,
      name: "Ibuprofen 400 mg",
      description: "Relieves pain and fever.",
      category: "Pain Relief",
      brand: "Acme",
      activeIngredients: ["ibuprofen"],
      dosageForm: "tablet",
      requiresPrescription: false,
      inStock: true,
      price: 4.99,
      imageUrl: "https://img.example.com/42.png",
    });
  });

  it("marks a product with no stock as out of stock", () => {
    expect(toSearchDocument({ ...row, stockQuantity: 0 }).inStock).toBe(false);
  });

  it("keeps unknown optional fields as null", () => {
    const doc = toSearchDocument({ ...row, dosageForm: null, imageUrl: null });
    expect(doc).toMatchObject({ dosageForm: null, imageUrl: null });
  });

  it("only produces fields the strict mapping declares", () => {
    const mapped = Object.keys(productIndexBody.mappings?.properties ?? {});
    for (const key of Object.keys(toSearchDocument(row))) expect(mapped).toContain(key);
  });
});
