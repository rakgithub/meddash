import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { orderSummary } from "../../../test/fixtures";
import * as api from "../api/ordersApi";
import { useOrders } from "./useOrders";

vi.mock("../api/ordersApi");

beforeEach(() => vi.resetAllMocks());

describe("useOrders", () => {
  it("starts loading, then returns the orders", async () => {
    vi.mocked(api.listOrders).mockResolvedValue([orderSummary]);
    const { result } = renderHook(() => useOrders());
    expect(result.current).toEqual({ status: "loading" });

    await waitFor(() =>
      expect(result.current).toEqual({ status: "success", orders: [orderSummary] }),
    );
  });

  it("reports an error", async () => {
    vi.mocked(api.listOrders).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useOrders());

    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });
});
