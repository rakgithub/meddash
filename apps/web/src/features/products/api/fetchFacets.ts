import { apiGet } from "../../../lib/apiClient";
import type { Facets, ProductFilters } from "../types";
import { buildSearchParams } from "../utils/buildSearchParams";

export function fetchFacets(filters: ProductFilters, signal?: AbortSignal): Promise<Facets> {
  const query = buildSearchParams(filters).toString();
  return apiGet<Facets>(`/search/facets${query ? `?${query}` : ""}`, { signal });
}
