// The API has no endpoint that lists categories/brands, so the options live here.
// Replace with a fetch (e.g. GET /facets) when the server exposes one.
export const CATEGORIES = ["cold-flu", "pain-relief", "skin-care", "vitamins"] as const;

export type Category = (typeof CATEGORIES)[number];

/** Everyday words people type when they mean a category, so "headache" can suggest Pain relief. */
export const CATEGORY_KEYWORDS: Record<Category, readonly string[]> = {
  "cold-flu": ["cold", "flu", "cough", "sore throat", "blocked nose", "sinus"],
  "pain-relief": ["pain", "headache", "migraine", "fever", "back pain", "muscle"],
  "skin-care": ["skin", "sunscreen", "dry skin", "eczema", "moisturiser", "acne"],
  vitamins: ["vitamin", "supplement", "immune", "magnesium", "zinc", "tiredness"],
};

export const BRANDS = [
  "Abtei",
  "Dobendan",
  "Doppelherz",
  "Eucerin",
  "Neutrogena",
  "Nurofen",
  "Otriven",
  "Prospan",
  "Ratiopharm",
] as const;
