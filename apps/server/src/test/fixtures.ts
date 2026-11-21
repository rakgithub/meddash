import type { CatalogueItem } from "../db/products.repo.js";
import type { CaseFile } from "../schemas/assistant.schema.js";
import type { ProductDetail } from "../schemas/product.schema.js";

export const emptyCaseFile: CaseFile = { symptoms: [], duration: null, forWhom: null, avoid: [] };

export function product(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "1",
    name: "Throat Lozenges",
    description: "Soothes a sore throat",
    category: "cold-flu",
    brand: "Brand",
    price: 4.99,
    imageUrl: null,
    sku: null,
    pzn: null,
    packSize: "24 lozenges",
    dosageForm: "Lozenge",
    activeIngredients: ["Amylmetacresol 0.6 mg"],
    usageInstructions: null,
    warnings: null,
    requiresPrescription: false,
    stockQuantity: 10,
    manufacturer: null,
    ...overrides,
  };
}

/** The slim view the model sees for a product. */
export function catalogueItem(p: ProductDetail): CatalogueItem {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    dosageForm: p.dosageForm,
    activeIngredients: p.activeIngredients,
    packSize: p.packSize,
    price: p.price,
    requiresPrescription: p.requiresPrescription,
    warnings: p.warnings,
  };
}
