// Word starts people use when describing how they feel rather than naming a product.
const SYMPTOM_WORDS =
  /\b(ach|allerg|bloat|blocked nose|cold\b|congest|cough|diarrh|dizz|fever|flu\b|hay ?fever|headache|heartburn|indigestion|insomnia|itch|migraine|nause|pain|pollen|rash|sleep|sneez|sore|sprain|stomach|stuffy|temperature|throat|tired)/i;

/** Whether a search reads like a symptom, so the page can point to the assistant. */
export function looksLikeSymptom(query: string) {
  return SYMPTOM_WORDS.test(query);
}
