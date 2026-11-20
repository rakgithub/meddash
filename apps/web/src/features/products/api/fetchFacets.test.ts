import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFacets } from "./fetchFacets";
import { EMPTY_FILTERS, type Facets } from "../types";

const payload: Facets = {
  categories: [{ value: "vitamins", count: 3 }],
  brands: [{ value: "Abtei", count: 1 }],
  price: { min: 2, max: 10, buckets: [{ from: 2, to: 10, count: 3 }] },
};

function stubFetch() {
  const fn = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchFacets", () => {
  it("calls /api/search/facets without a query string when no filters are set", async () => {
    const fetchMock = stubFetch();

    await expect(fetchFacets(EMPTY_FILTERS)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith("/api/search/facets", { signal: undefined });
  });

  it("sends the filters as query params", async () => {
    const fetchMock = stubFetch();
    const { signal } = new AbortController();

    await fetchFacets({ ...EMPTY_FILTERS, q: "gel", category: "skin-care", maxPrice: "9" }, signal);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/search/facets?q=gel&category=skin-care&maxPrice=9",
      { signal },
    );
  });

  it("rejects when the server responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: "Bad Request" }),
    );

    await expect(fetchFacets(EMPTY_FILTERS)).rejects.toMatchObject({ status: 400 });
  });
});
