import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSuggestions } from "./fetchSuggestions";

afterEach(() => vi.unstubAllGlobals());

const items = [{ id: "1", name: "Ibuprofen 400mg", brand: "Nurofen" }];

describe("fetchSuggestions", () => {
  it("calls /api/search/suggest with an encoded q and the signal, returning the items", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items }) });
    vi.stubGlobal("fetch", fetchMock);
    const { signal } = new AbortController();

    await expect(fetchSuggestions("vitamin d&c", signal)).resolves.toEqual(items);
    expect(fetchMock).toHaveBeenCalledWith("/api/search/suggest?q=vitamin+d%26c", { signal });
  });

  it("rejects when the server responds with an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: "Bad Request" }),
    );

    await expect(fetchSuggestions("x")).rejects.toMatchObject({ status: 400 });
  });
});
