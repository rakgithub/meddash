import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SUGGEST_DEBOUNCE_MS, useSuggestions } from "./useSuggestions";
import * as api from "../api/fetchSuggestions";
import type { Suggestion } from "../types";

vi.mock("../api/fetchSuggestions");
const fetchSuggestions = vi.mocked(api.fetchSuggestions);

const ibu: Suggestion = { id: "1", name: "Ibuprofen 400mg", brand: "Nurofen" };
const vit: Suggestion = { id: "3", name: "Vitamin D3 1000 IU", brand: "Doppelherz" };

/** A promise the test resolves/rejects by hand, to control response order. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const render = (input: string) =>
  renderHook(({ q }) => useSuggestions(q), { initialProps: { q: input } });

// Flush the debounce timer, then let resolved promises settle.
const settle = () => act(() => vi.advanceTimersByTimeAsync(SUGGEST_DEBOUNCE_MS));

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("useSuggestions", () => {
  it("is idle and does not fetch below 2 characters", async () => {
    const { result } = render(" i ");
    await settle();

    expect(result.current).toEqual({ suggestions: [], status: "idle" });
    expect(fetchSuggestions).not.toHaveBeenCalled();
  });

  it("debounces: only fetches the last term once typing pauses", async () => {
    fetchSuggestions.mockResolvedValue([ibu]);
    const { result, rerender } = render("ib");
    await act(() => vi.advanceTimersByTimeAsync(SUGGEST_DEBOUNCE_MS - 1));
    rerender({ q: "ibu" });

    expect(result.current.status).toBe("loading");
    await settle();

    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
    expect(fetchSuggestions).toHaveBeenCalledWith("ibu", expect.any(AbortSignal));
    expect(result.current).toEqual({ suggestions: [ibu], status: "success" });
  });

  it("trims the term before fetching", async () => {
    fetchSuggestions.mockResolvedValue([]);
    render("  ibu  ");
    await settle();

    expect(fetchSuggestions).toHaveBeenCalledWith("ibu", expect.any(AbortSignal));
  });

  it("aborts a stale request and ignores its late response", async () => {
    const first = deferred<Suggestion[]>();
    const second = deferred<Suggestion[]>();
    fetchSuggestions.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = render("ib");
    await settle();
    const firstSignal = fetchSuggestions.mock.calls[0][1];

    rerender({ q: "vi" });
    expect(firstSignal?.aborted).toBe(true);
    await settle();

    // Responses arrive out of order: the new one first, then the stale one.
    await act(async () => second.resolve([vit]));
    await act(async () => first.resolve([ibu]));

    expect(result.current).toEqual({ suggestions: [vit], status: "success" });
  });

  it("keeps the previous suggestions while the next term loads", async () => {
    fetchSuggestions.mockResolvedValueOnce([ibu]).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = render("ib");
    await settle();

    rerender({ q: "ibu" });

    expect(result.current).toEqual({ suggestions: [ibu], status: "loading" });
  });

  it("reports an error when the request fails", async () => {
    fetchSuggestions.mockRejectedValue(new Error("boom"));
    const { result } = render("ibu");
    await settle();

    expect(result.current).toEqual({ suggestions: [], status: "error" });
  });

  it("goes back to idle when the input is cleared", async () => {
    fetchSuggestions.mockResolvedValue([ibu]);
    const { result, rerender } = render("ibu");
    await settle();

    rerender({ q: "" });

    expect(result.current).toEqual({ suggestions: [], status: "idle" });
  });

  it("aborts the in-flight request on unmount", async () => {
    fetchSuggestions.mockReturnValue(new Promise(() => {}));
    const { unmount } = render("ibu");
    await settle();

    unmount();

    expect(fetchSuggestions.mock.calls[0][1]?.aborted).toBe(true);
  });
});
