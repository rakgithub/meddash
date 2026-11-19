import { EMPTY_FILTERS, type ProductFilters } from "../types";

/** Reads filters and page from the URL; the inverse of `buildSearchParams`. */
export function parseSearchParams(params: URLSearchParams): {
  filters: ProductFilters;
  page: number;
} {
  const filters = { ...EMPTY_FILTERS };
  for (const key of Object.keys(EMPTY_FILTERS) as (keyof ProductFilters)[]) {
    filters[key] = params.get(key)?.trim() ?? "";
  }
  // A hand-edited or stale URL may hold anything; fall back to the first page.
  const page = Number(params.get("page"));
  return { filters, page: Number.isInteger(page) && page >= 1 ? page : 1 };
}
