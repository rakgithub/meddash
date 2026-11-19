import { useEffect, useState } from "react";
import { searchProducts } from "../api/searchProducts";
import type { Pagination, Product } from "../types";
import { parseSearchParams } from "../utils/parseSearchParams";
import { buildSearchParams } from "../utils/buildSearchParams";
import { useSearchQuery } from "./useSearchQuery";

type Status = "loading" | "error" | "success";

/** Calls the search API for the filters and page in the URL, and again on every new search. */
export function useProductSearch() {
  const { filters, page, navigationKey, search, goToPage } = useSearchQuery();
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  // A string, so the effect doesn't re-run for each render's freshly parsed filters object.
  const query = buildSearchParams(filters, page).toString();

  useEffect(() => {
    const controller = new AbortController();
    const current = parseSearchParams(new URLSearchParams(query));
    // Intentional: reset to loading when a new query starts, before the fetch below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    searchProducts(current.filters, current.page, controller.signal)
      .then((data) => {
        setProducts(data.items);
        setPagination(data.pagination);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [query, navigationKey]);

  return { products, pagination, status, filters, search, goToPage };
}
