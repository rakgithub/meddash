import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProductSearch } from "./useProductSearch";
import * as api from "../api/searchProducts";
import { EMPTY_FILTERS } from "../types";
import { ibuprofen, vitaminD } from "../../../test/fixtures";

vi.mock("../api/searchProducts");
const searchProducts = vi.mocked(api.searchProducts);

const response = (items = [ibuprofen, vitaminD], page = 1, totalPages = 1) => ({
  items,
  pagination: { page, pageSize: 10, total: items.length, totalPages },
});

beforeEach(() => vi.resetAllMocks());

// The search state lives in the URL, so the hook runs inside a router starting at `url`.
function renderSearch(url = "/") {
  return renderHook(() => ({ ...useProductSearch(), location: useLocation() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
    ),
  });
}

describe("useProductSearch", () => {
  it("starts loading, then loads everything with empty filters", async () => {
    searchProducts.mockResolvedValue(response());

    const { result } = renderSearch();
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.products).toEqual([ibuprofen, vitaminD]);
    expect(result.current.pagination?.total).toBe(2);
    expect(searchProducts).toHaveBeenCalledWith(EMPTY_FILTERS, 1, expect.any(AbortSignal));
  });

  it("sets the error status when the request fails", async () => {
    searchProducts.mockRejectedValue(new Error("boom"));

    const { result } = renderSearch();

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("calls the API again with the new filters when search is called", async () => {
    searchProducts.mockResolvedValue(response());
    const { result } = renderSearch();
    await waitFor(() => expect(result.current.status).toBe("success"));

    searchProducts.mockResolvedValue(response([ibuprofen]));
    const filters = { ...EMPTY_FILTERS, q: "ibuprofen" };
    act(() => result.current.search(filters));

    await waitFor(() => expect(result.current.products).toEqual([ibuprofen]));
    expect(searchProducts).toHaveBeenLastCalledWith(filters, 1, expect.any(AbortSignal));
  });

  it("searches again even when the filters have not changed", async () => {
    searchProducts.mockResolvedValue(response());
    const { result } = renderSearch();
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(searchProducts).toHaveBeenCalledTimes(1);

    act(() => result.current.search(EMPTY_FILTERS));

    await waitFor(() => expect(searchProducts).toHaveBeenCalledTimes(2));
  });

  it("keeps the filters and changes the page with goToPage", async () => {
    searchProducts.mockResolvedValue(response([ibuprofen], 1, 2));
    const { result } = renderSearch();
    await waitFor(() => expect(result.current.status).toBe("success"));

    const filters = { ...EMPTY_FILTERS, category: "vitamins" };
    act(() => result.current.search(filters));
    await waitFor(() => expect(searchProducts).toHaveBeenCalledTimes(2));

    act(() => result.current.goToPage(2));

    await waitFor(() =>
      expect(searchProducts).toHaveBeenLastCalledWith(filters, 2, expect.any(AbortSignal)),
    );
  });

  it("goes back to page 1 on a new search", async () => {
    searchProducts.mockResolvedValue(response([ibuprofen], 1, 3));
    const { result } = renderSearch();
    await waitFor(() => expect(result.current.status).toBe("success"));
    act(() => result.current.goToPage(3));
    await waitFor(() => expect(searchProducts).toHaveBeenCalledTimes(2));

    act(() => result.current.search({ ...EMPTY_FILTERS, q: "x" }));

    await waitFor(() =>
      expect(searchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "x" }),
        1,
        expect.any(AbortSignal),
      ),
    );
  });

  it("aborts the in-flight request on unmount", () => {
    searchProducts.mockReturnValue(new Promise(() => {}));

    const { unmount } = renderSearch();
    const signal = searchProducts.mock.calls[0][2] as AbortSignal;
    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("reads the filters and page from the URL", async () => {
    searchProducts.mockResolvedValue(response());

    const { result } = renderSearch("/?q=ibu&category=pain-relief&page=2");

    await waitFor(() => expect(result.current.status).toBe("success"));
    const filters = { ...EMPTY_FILTERS, q: "ibu", category: "pain-relief" };
    expect(result.current.filters).toEqual(filters);
    expect(searchProducts).toHaveBeenCalledWith(filters, 2, expect.any(AbortSignal));
  });

  it("writes a search and a page change to the URL of /shop", async () => {
    searchProducts.mockResolvedValue(response([ibuprofen], 1, 2));
    const { result } = renderSearch("/products/1");
    await waitFor(() => expect(result.current.status).toBe("success"));

    act(() => result.current.search({ ...EMPTY_FILTERS, q: "vitamin d", brand: "Abtei" }));
    expect(result.current.location.pathname).toBe("/shop");
    expect(result.current.location.search).toBe("?q=vitamin+d&brand=Abtei");

    act(() => result.current.goToPage(2));
    expect(result.current.location.search).toBe("?q=vitamin+d&brand=Abtei&page=2");
  });

  it("clears the query string when every filter is empty", async () => {
    searchProducts.mockResolvedValue(response());
    const { result } = renderSearch("/?q=ibu");
    await waitFor(() => expect(result.current.status).toBe("success"));

    act(() => result.current.search(EMPTY_FILTERS));

    expect(result.current.location.search).toBe("");
  });
});
