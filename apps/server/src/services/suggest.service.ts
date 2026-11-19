import { findSuggestions } from "../db/products.repo.js";
import { SUGGEST_LIMIT, type SuggestResponse } from "../schemas/suggest.schema.js";

/**
 * Products whose name or brand starts with `q` (case-insensitive).
 * Name matches rank above brand-only matches; ties keep catalogue order.
 */
export async function suggestProducts(q: string, find = findSuggestions): Promise<SuggestResponse> {
  return { items: await find(q, SUGGEST_LIMIT) };
}
