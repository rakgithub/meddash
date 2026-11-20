import type { Recommendation } from "../types";
import { AVOID_TABLETS } from "./caseFile";

/** Swallowed forms. A lozenge is dissolved in the mouth, so it stays. */
const SWALLOWED = /tablet|capsule|caplet/i;

function isRuledOut(item: Recommendation, dismissed: string[], avoid: string[]): boolean {
  if (dismissed.includes(item.product.id)) return true;
  const noTablets = avoid.some((a) => a.toLowerCase() === AVOID_TABLETS.toLowerCase());
  return noTablets && SWALLOWED.test(item.product.dosageForm ?? "");
}

/**
 * Leaves out the products the user ruled out ("Not for me", or an avoided dosage form). When that
 * removes the best fit, the first good fit without a caution takes its place, so the stack still
 * leads with a clear choice.
 */
export function ruleOut(
  items: Recommendation[],
  dismissed: string[],
  avoid: string[],
): Recommendation[] {
  const kept = items.filter((item) => !isRuledOut(item, dismissed, avoid));
  if (kept.length === items.length) return items;

  const lostBest = items.some((item) => item.fit === "best" && !kept.includes(item));
  if (!lostBest || kept.some((item) => item.fit === "best")) return kept;

  const next = kept.findIndex((item) => item.fit === "good" && !item.caution);
  if (next === -1) return kept;
  return kept.map((item, i): Recommendation => (i === next ? { ...item, fit: "best" } : item));
}
