import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { ProductFilters } from "../types";
import { buildSearchParams } from "../utils/buildSearchParams";
import { parseSearchParams } from "../utils/parseSearchParams";

export const SHOP_PATH = "/shop";

/**
 * The product search lives in the URL of `/shop`, so any page can start a search (the product
 * page's category links do), browser Back restores the results, and a search can be shared as a link.
 */
export function useSearchQuery() {
  const [searchParams] = useSearchParams();
  const { key } = useLocation();
  const navigate = useNavigate();
  const { filters, page } = parseSearchParams(searchParams);

  function go(nextFilters: ProductFilters, nextPage: number) {
    const search = buildSearchParams(nextFilters, nextPage).toString();
    navigate({ pathname: SHOP_PATH, search: search ? `?${search}` : "" });
  }

  return {
    filters,
    page,
    /** Changes on every navigation, even to the same URL, so a repeated search re-fetches. */
    navigationKey: key,
    search: (nextFilters: ProductFilters) => go(nextFilters, 1),
    goToPage: (nextPage: number) => go(filters, nextPage),
  };
}
