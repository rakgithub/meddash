import { useEffect, useState } from "react";
import { fetchFacets } from "../api/fetchFacets";
import type { Facets, ProductFilters } from "../types";
import { buildSearchParams } from "../utils/buildSearchParams";
import { parseSearchParams } from "../utils/parseSearchParams";

/**
 * Counts and the price spread for the current filters. They only decorate the filters, so while
 * loading, or if the request fails, this is null and the filters work without them.
 */
export function useFacets(filters: ProductFilters): Facets | null {
  const [facets, setFacets] = useState<Facets | null>(null);
  // A string, so the effect doesn't re-run for each render's freshly parsed filters object.
  const query = buildSearchParams(filters).toString();

  useEffect(() => {
    const controller = new AbortController();
    const current = parseSearchParams(new URLSearchParams(query)).filters;
    fetchFacets(current, controller.signal)
      .then(setFacets)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFacets(null);
      });
    return () => controller.abort();
  }, [query]);

  return facets;
}
