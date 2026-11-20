import { afterEach, describe, expect, it, vi } from "vitest";
import { addToCart, getCart, removeCartItem, updateCartItem } from "./cartApi";
import { cartWithIbuprofen } from "../../../test/fixtures";

function mockFetch(response: Partial<Response>) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const ok = { ok: true, json: async () => cartWithIbuprofen };

afterEach(() => vi.unstubAllGlobals());

describe("cartApi", () => {
  it("gets the cart with an abort signal", async () => {
    const fetchMock = mockFetch(ok);
    const { signal } = new AbortController();

    await expect(getCart(signal)).resolves.toEqual(cartWithIbuprofen);
    expect(fetchMock).toHaveBeenCalledWith("/api/cart", { signal });
  });

  it("adds an item", async () => {
    const fetchMock = mockFetch(ok);

    await expect(addToCart("1", 2)).resolves.toEqual(cartWithIbuprofen);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cart/items",
      expect.objectContaining({ method: "POST", body: '{"productId":"1","quantity":2}' }),
    );
  });

  it("updates a line's quantity", async () => {
    const fetchMock = mockFetch(ok);

    await updateCartItem("1", 4);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cart/items/1",
      expect.objectContaining({ method: "PATCH", body: '{"quantity":4}' }),
    );
  });

  it("removes a line, encoding the id so it cannot change the path", async () => {
    const fetchMock = mockFetch(ok);

    await removeCartItem("1/../x");
    expect(fetchMock).toHaveBeenCalledWith("/api/cart/items/1%2F..%2Fx", { method: "DELETE" });
  });

  it("rejects with the server's message", async () => {
    mockFetch({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: async () => ({ error: { message: "Only 3 left in stock" } }),
    });

    await expect(addToCart("4", 5)).rejects.toMatchObject({
      status: 409,
      message: "Only 3 left in stock",
    });
  });
});
