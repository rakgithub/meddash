import { useEffect, useState } from "react";
import { fetchSuggestions } from "../api/fetchSuggestions";
import type { Suggestion } from "../types";

export const SUGGEST_DEBOUNCE_MS = 250;
export const SUGGEST_MIN_LENGTH = 2;

export type SuggestStatus = "idle" | "loading" | "success" | "error";

interface Result {
  term: string;
  items: Suggestion[];
  status: "success" | "error";
}

/**
 * Debounced autocomplete for `input`. Each new term cancels the pending timer and
 * aborts the in-flight request, so a slow response for an old term can never
 * overwrite the suggestions for the current one.
 */
export function useSuggestions(input: string): {
  suggestions: Suggestion[];
  status: SuggestStatus;
} {
  const term = input.trim();
  const enabled = term.length >= SUGGEST_MIN_LENGTH;
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchSuggestions(term, controller.signal)
        .then((items) => {
          // The response can resolve after cleanup aborted it; drop it then.
          if (!controller.signal.aborted) setResult({ term, items, status: "success" });
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setResult({ term, items: [], status: "error" });
        });
    }, SUGGEST_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, enabled]);

  if (!enabled) return { suggestions: [], status: "idle" };
  // Keep showing the previous term's suggestions while the new ones load, so the list doesn't flicker.
  const status: SuggestStatus = result?.term === term ? result.status : "loading";
  return { suggestions: result?.items ?? [], status };
}
