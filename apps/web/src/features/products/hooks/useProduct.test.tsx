import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProduct } from "./useProduct";
import * as api from "../api/fetchProduct";
import { ApiError } from "../../../lib/apiClient";
import { ibuprofenDetail, coughSyrupDetail } from "../../../test/fixtures";

vi.mock("../api/fetchProduct");
const fetchProduct = vi.mocked(api.fetchProduct);

beforeEach(() => vi.resetAllMocks());

describe("useProduct", () => {
  it("starts loading, then returns the product", async () => {
    fetchProduct.mockResolvedValue(ibuprofenDetail);

    const { result } = renderHook(() => useProduct("1"));
    expect(result.current).toEqual({ status: "loading" });

    await waitFor(() =>
      expect(result.current).toEqual({ status: "success", product: ibuprofenDetail }),
    );
    expect(fetchProduct).toHaveBeenCalledWith("1", expect.any(AbortSignal));
  });

  it("reports not-found for a 404", async () => {
    fetchProduct.mockRejectedValue(new ApiError(404, "Not Found"));

    const { result } = renderHook(() => useProduct("99"));

    await waitFor(() => expect(result.current).toEqual({ status: "not-found" }));
  });

  it.each([
    ["a server error", new ApiError(500, "Internal Server Error")],
    ["a network failure", new TypeError("Failed to fetch")],
  ])("reports error for %s", async (_name, failure) => {
    fetchProduct.mockRejectedValue(failure);

    const { result } = renderHook(() => useProduct("1"));

    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("goes back to loading when the id changes, then shows the new product", async () => {
    fetchProduct.mockResolvedValueOnce(ibuprofenDetail).mockResolvedValueOnce(coughSyrupDetail);

    const { result, rerender } = renderHook(({ id }) => useProduct(id), {
      initialProps: { id: "1" },
    });
    await waitFor(() => expect(result.current.status).toBe("success"));

    rerender({ id: "7" });
    expect(result.current).toEqual({ status: "loading" });

    await waitFor(() =>
      expect(result.current).toEqual({ status: "success", product: coughSyrupDetail }),
    );
  });

  it("aborts the request on unmount and ignores the abort", async () => {
    fetchProduct.mockImplementation(
      (_id, signal) =>
        new Promise((_resolve, reject) =>
          signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          ),
        ),
    );

    const { result, unmount } = renderHook(() => useProduct("1"));
    unmount();

    expect(fetchProduct.mock.calls[0]![1]?.aborted).toBe(true);
    expect(result.current).toEqual({ status: "loading" });
  });
});
