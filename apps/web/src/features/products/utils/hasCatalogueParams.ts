import { EMPTY_FILTERS } from "../types";

const CATALOGUE_KEYS = [...Object.keys(EMPTY_FILTERS), "page"];

/** Whether a URL carries a catalogue search, filter or page: old `/?q=…` links that now belong on `/shop`. */
export function hasCatalogueParams(params: URLSearchParams): boolean {
  return CATALOGUE_KEYS.some((key) => params.has(key));
}
