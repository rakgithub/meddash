import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../lib/apiClient";
import { order } from "../../../test/fixtures";
import * as api from "../api/ordersApi";
import { useOrder } from "./useOrder";

vi.mock("../api/ordersApi");

beforeEach(() => vi.resetAllMocks());

describe("useOrder", () => {
  it("starts loading, then returns the order", async () => {
    vi.mocked(api.getOrder).mockResolvedValue(order);
    const { result } = renderHook(() => useOrder("7"));
    expect(result.current).toEqual({ status: "loading" });

    await waitFor(() => expect(result.current).toEqual({ status: "success", order }));
    expect(api.getOrder).toHaveBeenCalledWith("7", expect.any(AbortSignal));
  });

  it("reports not-found for a 404", async () => {
    vi.mocked(api.getOrder).mockRejectedValue(new ApiError(404, "Order not found"));
    const { result } = renderHook(() => useOrder("99"));

    await waitFor(() => expect(result.current).toEqual({ status: "not-found" }));
  });

  it("reports an error for anything else", async () => {
    vi.mocked(api.getOrder).mockRejectedValue(new ApiError(500, "Internal Server Error"));
    const { result } = renderHook(() => useOrder("7"));

    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });

  it("goes back to loading when the id changes", async () => {
    vi.mocked(api.getOrder)
      .mockResolvedValueOnce(order)
      .mockResolvedValueOnce({ ...order, id: 8 });
    const { result, rerender } = renderHook(({ id }) => useOrder(id), {
      initialProps: { id: "7" },
    });
    await waitFor(() => expect(result.current.status).toBe("success"));

    rerender({ id: "8" });
    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() =>
      expect(result.current).toEqual({ status: "success", order: { ...order, id: 8 } }),
    );
  });
});
