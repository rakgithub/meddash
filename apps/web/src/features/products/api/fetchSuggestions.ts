import { apiGet } from "../../../lib/apiClient";
import type { Suggestion, SuggestResponse } from "../types";

export async function fetchSuggestions(q: string, signal?: AbortSignal): Promise<Suggestion[]> {
  const params = new URLSearchParams({ q });
  const { items } = await apiGet<SuggestResponse>(`/search/suggest?${params}`, { signal });
  return items;
}
