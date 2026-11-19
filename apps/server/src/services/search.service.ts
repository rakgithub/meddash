import { findProducts } from "../db/products.repo.js";
import type { Product } from "../schemas/product.schema.js";
import { PAGE_SIZE, type SearchQuery } from "../schemas/search.schema.js";

export interface SearchResult {
  items: Product[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function splitTerms(q: string | undefined): string[] {
  return q ? q.toLowerCase().split(/\s+/).filter(Boolean) : [];
}

export function pageOffset(page: number): number {
  return (page - 1) * PAGE_SIZE;
}

export async function searchProducts(
  query: SearchQuery,
  find = findProducts,
): Promise<SearchResult> {
  const { q, category, brand, minPrice, maxPrice, sort, page } = query;
  const { rows, total } = await find(
    { terms: splitTerms(q), category, brand, minPrice, maxPrice },
    sort,
    { limit: PAGE_SIZE, offset: pageOffset(page) },
  );
  return {
    items: rows,
    pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.ceil(total / PAGE_SIZE) },
  };
}
