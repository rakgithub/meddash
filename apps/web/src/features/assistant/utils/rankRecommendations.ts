import type { Recommendation } from "../types";

const ORDER: Record<Recommendation["fit"], number> = { best: 0, good: 1, locked: 2 };

/**
 * A prescription-only product is always `locked`, whatever fit it was suggested with, so it can never
 * be the top suggestion. Best fits come first and locked ones last; otherwise the order is kept.
 */
export function rankRecommendations(items: Recommendation[]): Recommendation[] {
  return items
    .map((item) => (item.product.requiresPrescription ? { ...item, fit: "locked" as const } : item))
    .sort((a, b) => ORDER[a.fit] - ORDER[b.fit]);
}
