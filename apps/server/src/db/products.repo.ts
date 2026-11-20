import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  gte,
  ilike,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Product, ProductDetail } from "../schemas/product.schema.js";
import type { SortOption } from "../schemas/search.schema.js";
import type { Suggestion } from "../schemas/suggest.schema.js";
import { db } from "./client.js";
import { products, type ProductRow } from "./schema.js";

export interface ProductFilters {
  /** Lower-cased search terms; every one must match name, brand or description. */
  terms: string[];
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface PageRequest {
  limit: number;
  offset: number;
}

/** Escapes LIKE wildcards so user input only ever matches literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Builds the API shape field by field, so DB columns never leak into responses. */
export function toProduct(row: ProductRow): Product {
  return {
    id: String(row.id),
    name: row.name,
    description: row.description,
    category: row.category,
    brand: row.brand,
    // pg returns numeric as a string to avoid precision loss; 2-decimal prices fit a JS number.
    price: Number(row.price),
    imageUrl: row.imageUrl,
  };
}

/** The full shape for the detail page; the list keeps the slim `toProduct` shape. */
export function toProductDetail(row: ProductRow): ProductDetail {
  return {
    ...toProduct(row),
    sku: row.sku,
    pzn: row.pzn,
    packSize: row.packSize,
    dosageForm: row.dosageForm,
    activeIngredients: row.activeIngredients,
    usageInstructions: row.usageInstructions,
    warnings: row.warnings,
    requiresPrescription: row.requiresPrescription,
    stockQuantity: row.stockQuantity,
    manufacturer: row.manufacturer,
  };
}

const contains = (term: string) => `%${escapeLike(term)}%`;

function whereClause(f: ProductFilters): SQL | undefined {
  return and(
    f.category === undefined ? undefined : sql`lower(${products.category}) = lower(${f.category})`,
    f.brand === undefined ? undefined : sql`lower(${products.brand}) = lower(${f.brand})`,
    f.minPrice === undefined ? undefined : gte(products.price, String(f.minPrice)),
    f.maxPrice === undefined ? undefined : lte(products.price, String(f.maxPrice)),
    ...f.terms.map((term) =>
      or(
        ilike(products.name, contains(term)),
        ilike(products.brand, contains(term)),
        ilike(products.description, contains(term)),
      ),
    ),
  );
}

/** Name matches score 2, brand/description matches 1, summed over terms. */
function relevance(terms: string[]): SQL {
  const perTerm = terms.map(
    (term) => sql`CASE WHEN ${products.name} ILIKE ${contains(term)} THEN 2 ELSE 1 END`,
  );
  return sql.join(perTerm, sql` + `);
}

// Pinned "C" collation: name order must not depend on how the database was created.
const nameKey = sql`lower(${products.name}) COLLATE "C"`;

// `id` breaks ties everywhere, so equal values keep catalogue order.
function orderBy(sort: SortOption, terms: string[]): SQL[] {
  switch (sort) {
    case "relevance":
      return terms.length ? [desc(relevance(terms)), asc(products.id)] : [asc(products.id)];
    case "price_asc":
      return [asc(products.price), asc(products.id)];
    case "price_desc":
      return [desc(products.price), asc(products.id)];
    case "name_asc":
      return [asc(nameKey), asc(products.id)];
    case "name_desc":
      return [desc(nameKey), asc(products.id)];
  }
}

export async function findProducts(
  filters: ProductFilters,
  sort: SortOption,
  page: PageRequest,
): Promise<{ rows: Product[]; total: number }> {
  const where = whereClause(filters);
  // The window count shares a snapshot with the rows and avoids a second scan.
  const rows = await db
    .select({ ...getTableColumns(products), total: sql<number>`count(*) over()`.mapWith(Number) })
    .from(products)
    .where(where)
    .orderBy(...orderBy(sort, filters.terms))
    .limit(page.limit)
    .offset(page.offset);
  if (rows.length > 0) return { rows: rows.map(toProduct), total: rows[0].total };
  // A page past the last result has no rows to carry the total, so count separately.
  const counted = await db.select({ total: count() }).from(products).where(where);
  return { rows: [], total: counted[0]?.total ?? 0 };
}

/**
 * What each filter would show if it were not applied: a facet ignores its own filter, so picking a
 * category still shows the other categories and what they hold.
 */
export async function findFacetData(filters: ProductFilters): Promise<{
  categories: { value: string; count: number }[];
  brands: { value: string; count: number }[];
  prices: number[];
}> {
  const [categories, brands, prices] = await Promise.all([
    db
      .select({ value: products.category, count: count() })
      .from(products)
      .where(whereClause({ ...filters, category: undefined }))
      .groupBy(products.category)
      .orderBy(asc(products.category)),
    db
      .select({ value: products.brand, count: count() })
      .from(products)
      .where(whereClause({ ...filters, brand: undefined }))
      .groupBy(products.brand)
      .orderBy(asc(products.brand)),
    db
      .select({ price: products.price })
      .from(products)
      .where(whereClause({ ...filters, minPrice: undefined, maxPrice: undefined })),
  ]);
  return { categories, brands, prices: prices.map((r) => Number(r.price)) };
}

/** Name prefix matches first, then brand-only prefix matches, in catalogue order. */
export async function findSuggestions(prefix: string, limit: number): Promise<Suggestion[]> {
  const pattern = `${escapeLike(prefix.toLowerCase())}%`;
  const nameMatches = sql`lower(${products.name}) LIKE ${pattern}`;
  const rows = await db
    .select({ id: products.id, name: products.name, brand: products.brand })
    .from(products)
    .where(or(nameMatches, sql`lower(${products.brand}) LIKE ${pattern}`))
    .orderBy(sql`CASE WHEN ${nameMatches} THEN 0 ELSE 1 END`, asc(products.id))
    .limit(limit);
  return rows.map((r) => ({ id: String(r.id), name: r.name, brand: r.brand }));
}

// Bounds GET /products; use /search for pagination beyond this.
export const LIST_LIMIT = 100;

export async function listAllProducts(): Promise<Product[]> {
  const rows = await db.select().from(products).orderBy(asc(products.id)).limit(LIST_LIMIT);
  return rows.map(toProduct);
}

export async function findProductById(id: number): Promise<ProductDetail | null> {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return rows[0] ? toProductDetail(rows[0]) : null;
}
