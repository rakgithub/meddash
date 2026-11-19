import { products as catalogue } from "../data/products.js";
import type { Product } from "../types/product.js";
import { SUGGEST_LIMIT, type SuggestResponse } from "../schemas/suggest.schema.js";

/**
 * Products whose name or brand starts with `q` (case-insensitive).
 * Name matches rank above brand-only matches; ties keep catalogue order.
 */
export function suggestProducts(q: string, source: Product[] = catalogue): SuggestResponse {
  const prefix = q.toLowerCase();
  const nameMatches: Product[] = [];
  const brandMatches: Product[] = [];

  for (const p of source) {
    if (p.name.toLowerCase().startsWith(prefix)) nameMatches.push(p);
    else if (p.brand.toLowerCase().startsWith(prefix)) brandMatches.push(p);
  }

  return {
    items: [...nameMatches, ...brandMatches]
      .slice(0, SUGGEST_LIMIT)
      .map(({ id, name, brand }) => ({ id, name, brand })),
  };
}
