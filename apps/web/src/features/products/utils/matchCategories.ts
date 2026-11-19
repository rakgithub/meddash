import { CATEGORIES, CATEGORY_KEYWORDS, type Category } from "../filterOptions";
import { formatCategory } from "./formatCategory";

export interface CategoryMatch {
  slug: Category;
  /** The keyword that matched, when the category's own name didn't. */
  hint?: string;
}

/** Categories whose name or a keyword starts with `term` (or has a word that does). */
export function matchCategories(term: string): CategoryMatch[] {
  const t = term.trim().toLowerCase();
  if (!t) return [];

  return CATEGORIES.flatMap((slug): CategoryMatch[] => {
    if (matches(formatCategory(slug), t)) return [{ slug }];
    const keyword = CATEGORY_KEYWORDS[slug].find((k) => matches(k, t));
    return keyword ? [{ slug, hint: keyword }] : [];
  });
}

function matches(candidate: string, term: string) {
  const c = candidate.toLowerCase();
  return c.startsWith(term) || c.split(/\s+/).some((word) => word.startsWith(term));
}
