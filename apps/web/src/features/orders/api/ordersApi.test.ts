import { afterEach, describe, expect, it, vi } from "vitest";
import { order, orderSummary } from "../../../test/fixtures";
import { createOrder, getOrder, listOrders } from "./ordersApi";

function mockFetch(response: Partial<Response>) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("ordersApi", () => {
  it("creates an order from the cart", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => order });

    await expect(createOrder()).resolves.toEqual(order);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/orders",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("lists the orders and unwraps the list", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({ orders: [orderSummary] }) });
    const { signal } = new AbortController();

    await expect(listOrders(signal)).resolves.toEqual([orderSummary]);
    expect(fetchMock).toHaveBeenCalledWith("/api/orders", { signal });
  });

  it("gets one order by encoded id", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => order });

    await expect(getOrder("7")).resolves.toEqual(order);
    expect(fetchMock).toHaveBeenCalledWith("/api/orders/7", { signal: undefined });
  });

  it("rejects with the server's message", async () => {
    mockFetch({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: async () => ({ error: { message: "Your cart is empty" } }),
    });

    await expect(createOrder()).rejects.toMatchObject({
      status: 409,
      message: "Your cart is empty",
    });
  });
});
