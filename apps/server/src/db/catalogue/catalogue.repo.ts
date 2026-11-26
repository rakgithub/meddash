import { inArray, sql } from "drizzle-orm";
import { db, type Db } from "../client.js";
import { products } from "../schema.js";
import type { CatalogueProduct } from "./generate.js";

/** The pool, or a transaction (tests run inside one and roll it back). */
export type Executor = Pick<Db, "insert" | "select">;

const excluded = (column: string) => sql.raw(`excluded."${column}"`);

/**
 * Inserts new SKUs and updates existing ones in one statement, so a batch is all-or-nothing. Never
 * deletes. `stock_quantity` is left out of the update: orders change it, and a re-run must not
 * reset it. SKUs must be unique within `rows` (Postgres rejects a row that conflicts with itself).
 * Keep batches under ~3,000 rows: Postgres allows 65,535 parameters and each row uses 15.
 */
export async function upsertProductsBySku(
  rows: CatalogueProduct[],
  executor: Executor = db,
): Promise<{ inserted: number; updated: number }> {
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  const result = await executor
    .insert(products)
    .values(rows.map((row) => ({ ...row, price: row.price.toFixed(2) })))
    .onConflictDoUpdate({
      target: products.sku,
      set: {
        name: excluded("name"),
        description: excluded("description"),
        category: excluded("category"),
        brand: excluded("brand"),
        price: excluded("price"),
        imageUrl: excluded("image_url"),
        pzn: excluded("pzn"),
        packSize: excluded("pack_size"),
        dosageForm: excluded("dosage_form"),
        activeIngredients: excluded("active_ingredients"),
        usageInstructions: excluded("usage_instructions"),
        warnings: excluded("warnings"),
        requiresPrescription: excluded("requires_prescription"),
        manufacturer: excluded("manufacturer"),
      },
    })
    // xmax is 0 on a freshly inserted row and non-zero on one that the conflict updated.
    .returning({ inserted: sql<boolean>`(xmax = 0)` });

  const inserted = result.filter((r) => r.inserted).length;
  return { inserted, updated: result.length - inserted };
}

/** Which of these SKUs are already in the database; for the dry run. */
export async function findExistingSkus(
  skus: string[],
  executor: Executor = db,
): Promise<Set<string>> {
  if (skus.length === 0) return new Set();
  const rows = await executor
    .select({ sku: products.sku })
    .from(products)
    .where(inArray(products.sku, skus));
  return new Set(rows.flatMap((r) => (r.sku === null ? [] : [r.sku])));
}
