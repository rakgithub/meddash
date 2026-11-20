import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFacets } from "./useFacets";
import * as api from "../api/fetchFacets";
import { EMPTY_FILTERS, type Facets } from "../types";

vi.mock("../api/fetchFacets");
const fetchFacets = vi.mocked(api.fetchFacets);

const facets: Facets = {
  categories: [{ value: "vitamins", count: 3 }],
  brands: [],
  price: null,
};

beforeEach(() => vi.resetAllMocks());

describe("useFacets", () => {
  it("is null until the facets arrive", async () => {
    fetchFacets.mockResolvedValue(facets);

    const { result } = renderHook(() => useFacets(EMPTY_FILTERS));

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toEqual(facets));
  });

  it("asks again when a filter changes, and keeps the old facets until the new ones arrive", async () => {
    fetchFacets.mockResolvedValueOnce(facets).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ f }) => useFacets(f), {
      initialProps: { f: EMPTY_FILTERS },
    });
    await waitFor(() => expect(result.current).toEqual(facets));

    rerender({ f: { ...EMPTY_FILTERS, brand: "Abtei" } });

    expect(fetchFacets).toHaveBeenLastCalledWith(
      { ...EMPTY_FILTERS, brand: "Abtei" },
      expect.any(AbortSignal),
    );
    expect(result.current).toEqual(facets);
  });

  it("is null when the request fails", async () => {
    fetchFacets.mockResolvedValueOnce(facets).mockRejectedValueOnce(new Error("boom"));
    const { result, rerender } = renderHook(({ f }) => useFacets(f), {
      initialProps: { f: EMPTY_FILTERS },
    });
    await waitFor(() => expect(result.current).toEqual(facets));

    rerender({ f: { ...EMPTY_FILTERS, q: "x" } });

    await waitFor(() => expect(result.current).toBeNull());
  });

  it("cancels the request when the filters change or the page goes away", async () => {
    fetchFacets.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useFacets(EMPTY_FILTERS));
    const signal = fetchFacets.mock.calls[0][1];
    expect(signal?.aborted).toBe(false);

    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
