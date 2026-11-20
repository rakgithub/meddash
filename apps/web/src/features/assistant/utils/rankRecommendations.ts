import type { ForWhom, Recommendation } from "../types";

const ORDER: Record<Recommendation["fit"], number> = { best: 0, good: 1, locked: 2 };

/** What in a product's warnings concerns each group. "me" has no extra risk to look for. */
const CONCERNS: Record<Exclude<ForWhom, "me">, RegExp> = {
  pregnant: /pregnan|breast-?feed/i,
  child: /child|infant|under \d+ years/i,
  // Kidney and liver function decline with age, so those warnings matter more over 65.
  senior: /elderly|older (?:adults|people)|over 6\d|kidney|liver/i,
};

/** The first warning sentence that concerns who the product is for, if any. */
export function cautionFor(warnings: string | null, forWhom: ForWhom | null): string | undefined {
  if (!warnings || !forWhom || forWhom === "me") return undefined;
  const concern = CONCERNS[forWhom];
  const sentences = warnings.match(/[^.!?]+[.!?]*/g) ?? [];
  return sentences.map((s) => s.trim()).find((s) => concern.test(s));
}

/**
 * The safety rules every suggestion goes through, whoever produced it:
 * - a prescription-only product is always `locked`, so it can never be the top suggestion;
 * - a product whose warnings concern who it is for gets a `caution` and is never a best fit.
 * Best fits come first and locked ones last; otherwise the order is kept.
 */
export function rankRecommendations(
  items: Recommendation[],
  forWhom: ForWhom | null = null,
): Recommendation[] {
  return items
    .map((item): Recommendation => {
      if (item.product.requiresPrescription) return { ...item, fit: "locked" };
      const caution = cautionFor(item.product.warnings, forWhom);
      if (!caution) return item;
      return { ...item, caution, fit: item.fit === "best" ? "good" : item.fit };
    })
    .sort((a, b) => ORDER[a.fit] - ORDER[b.fit]);
}
