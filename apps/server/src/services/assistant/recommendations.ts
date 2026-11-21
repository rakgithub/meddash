import type { CaseFile, Recommendation } from "../../schemas/assistant.schema.js";
import type { ProductDetail } from "../../schemas/product.schema.js";

type ForWhom = NonNullable<CaseFile["forWhom"]>;
type Fit = Recommendation["fit"];

/** What the model asked for: a product it saw in a search result this turn, and why. */
export interface Suggestion {
  id: string;
  reason: string;
  fit: "best" | "good";
}

const ORDER: Record<Fit, number> = { best: 0, good: 1, locked: 2 };

/**
 * Server copy of the web rules (apps/web/src/features/assistant/utils/rankRecommendations.ts).
 * What in a product's warnings concerns each group. "me" has no extra risk to look for.
 */
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
 * Prescription-only products are always `locked`, so never first; a product whose warnings concern
 * who it is for gets a `caution` and is never a best fit. Best fits first, locked last, order kept.
 */
export function rankRecommendations(
  items: Recommendation[],
  forWhom: ForWhom | null,
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

/** Matches the web's "Not for me" entries (apps/web/src/features/assistant/utils/caseFile.ts). */
const AVOID_TABLETS = "tablets";
/** Swallowed forms. A lozenge is dissolved in the mouth, so it stays. */
const SWALLOWED = /tablet|capsule|caplet/i;

/** True when the case file's `avoid` list rules the product out. */
export function isAvoided(product: ProductDetail, avoid: string[]): boolean {
  const entries = avoid.map((a) => a.toLowerCase());
  if (entries.includes(AVOID_TABLETS) && SWALLOWED.test(product.dosageForm ?? "")) return true;
  const name = product.name.toLowerCase();
  return entries.includes(`already tried ${name}`) || entries.includes(`not ${name}`);
}

export interface Resolved {
  items: Recommendation[];
  /** Ids the model gave that no search returned this turn. */
  unknown: string[];
  /** Ids that were found in a search but could not be loaded now. */
  unavailable: number;
  /** Ids ruled out by the case file's `avoid` list. */
  avoided: string[];
}

/**
 * Turns the model's suggestions into the cards the user sees. The model never decides what exists:
 * only ids a search returned this turn are loaded, from the database, then the safety rules run.
 */
export async function resolveSuggestions(
  suggestions: Suggestion[],
  seenIds: ReadonlySet<string>,
  caseFile: CaseFile,
  findProductById: (id: number) => Promise<ProductDetail | null>,
): Promise<Resolved> {
  const unique = suggestions.filter((s, i) => suggestions.findIndex((o) => o.id === s.id) === i);
  const unknown = unique.filter((s) => !seenIds.has(s.id)).map((s) => s.id);
  const known = unique.filter((s) => seenIds.has(s.id));

  const loaded = await Promise.all(known.map((s) => findProductById(Number(s.id))));
  const items: Recommendation[] = [];
  const avoided: string[] = [];
  let unavailable = 0;
  known.forEach((s, i) => {
    const product = loaded[i];
    if (!product) {
      unavailable++;
      return;
    }
    if (isAvoided(product, caseFile.avoid)) {
      avoided.push(s.id);
      return;
    }
    items.push({ product, reason: s.reason, fit: s.fit });
  });

  return {
    items: rankRecommendations(items, caseFile.forWhom),
    unknown,
    unavailable,
    avoided,
  };
}
