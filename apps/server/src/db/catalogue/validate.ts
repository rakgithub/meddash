import { productDetailSchema } from "../../schemas/product.schema.js";
import type { CatalogueProduct } from "./generate.js";

// The API's own detail schema, so a generated product can never be one the API couldn't serve.
const catalogueProductSchema = productDetailSchema.omit({ id: true }).extend({
  sku: productDetailSchema.shape.sku.unwrap(),
});

/** One message per invalid product: "<sku>: <path> <reason>". Empty when all are valid. */
export function validateCatalogue(rows: CatalogueProduct[]): string[] {
  return rows.flatMap((row) => {
    const result = catalogueProductSchema.safeParse(row);
    if (result.success) return [];
    return result.error.issues.map((i) => `${row.sku}: ${i.path.join(".")} ${i.message}`);
  });
}
