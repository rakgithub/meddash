import type { ProductDetail } from "../../products";
import { FOR_WHOM, type CaseField, type CaseFile, type ForWhom, type QuickReply } from "../types";

export const emptyCaseFile: CaseFile = { symptoms: [], duration: null, forWhom: null, avoid: [] };

function isForWhom(value: string): value is ForWhom {
  return FOR_WHOM.some((option) => option === value);
}

/** Adds symptoms that aren't there yet (ignoring case and surrounding spaces), keeping the order. */
export function mergeUnique(current: string[], added: string[]): string[] {
  const result = [...current];
  for (const raw of added) {
    const symptom = raw.trim();
    const seen = result.some((s) => s.toLowerCase() === symptom.toLowerCase());
    if (symptom && !seen) result.push(symptom);
  }
  return result;
}

/** Stores a quick-reply answer. An unknown "who is it for" value is ignored rather than stored. */
export function applyAnswer(caseFile: CaseFile, field: CaseField, value: string): CaseFile {
  if (field === "symptoms")
    return { ...caseFile, symptoms: mergeUnique(caseFile.symptoms, [value]) };
  if (field === "duration") return { ...caseFile, duration: value };
  return isForWhom(value) ? { ...caseFile, forWhom: value } : caseFile;
}

export const DURATION_OPTIONS: QuickReply[] = [
  { label: "Since today", value: "today" },
  { label: "2–3 days", value: "2-3 days" },
  { label: "About a week", value: "a week" },
  { label: "Longer", value: "longer" },
];

export const FOR_WHOM_OPTIONS: QuickReply[] = [
  { label: "Me", value: "me" },
  { label: "A child", value: "child" },
  { label: "Someone pregnant", value: "pregnant" },
  { label: "Someone over 65", value: "senior" },
];

/** The "avoid" entry that hides tablets and capsules from every suggestion. */
export const AVOID_TABLETS = "Tablets";

export const DISMISS_REASONS = [
  "Too expensive",
  "I don’t swallow tablets",
  "Already tried",
  "Other",
] as const;
export type DismissReason = (typeof DISMISS_REASONS)[number];

/** What "Not for me" adds to the case file's `avoid` list for a product and the reason given. */
export function avoidFor(reason: DismissReason, product: ProductDetail): string {
  switch (reason) {
    case "Too expensive":
      return "Expensive options";
    case "I don’t swallow tablets":
      return AVOID_TABLETS;
    case "Already tried":
      return `Already tried ${product.name}`;
    case "Other":
      return `Not ${product.name}`;
  }
}
