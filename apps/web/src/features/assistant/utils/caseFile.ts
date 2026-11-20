import { FOR_WHOM, type CaseField, type CaseFile, type ForWhom } from "../types";

export const emptyCaseFile: CaseFile = { symptoms: [], duration: null, forWhom: null, avoid: [] };

function isForWhom(value: string): value is ForWhom {
  return FOR_WHOM.some((option) => option === value);
}

/** Adds symptoms that aren't there yet (ignoring case and surrounding spaces), keeping the order. */
export function mergeSymptoms(current: string[], added: string[]): string[] {
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
  if (field === "duration") return { ...caseFile, duration: value };
  return isForWhom(value) ? { ...caseFile, forWhom: value } : caseFile;
}
