/**
 * Search-time synonyms, in Solr format: comma-separated words are equivalent. They are applied by the
 * search analyzers only, so editing this list needs an index settings update, not a reindex.
 * Lower case; the analyzers lower-case before matching.
 */
export const synonyms: readonly string[] = [
  "paracetamol, acetaminophen",
  "painkiller, pain reliever, analgesic",
  "cold, flu",
  "antihistamine, allergy tablet, hay fever tablet",
  "plaster, band aid, bandage",
  "sunscreen, sun cream, sunblock",
  "heartburn, acid reflux",
];
