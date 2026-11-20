import { afterEach, describe, expect, it, vi } from "vitest";
import { cartWithIbuprofen } from "../../../test/fixtures";
import { getCart, removeCartItem, updateCartItem } from "./cartApi";

function mockFetch(response: Partial<Response>) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const ok = { ok: true, json: async () => cartWithIbuprofen };

afterEach(() => vi.unstubAllGlobals());

describe("getCart", () => {
  it("calls /api/cart with the signal and returns the cart", async () => {
    const fetchMock = mockFetch(ok);
    const { signal } = new AbortController();

    await expect(getCart(signal)).resolves.toEqual(cartWithIbuprofen);
    expect(fetchMock).toHaveBeenCalledWith("/api/cart", { signal });
  });
});

describe("updateCartItem", () => {
  it("patches the quantity of one product", async () => {
    const fetchMock = mockFetch(ok);

    await expect(updateCartItem("1", 3)).resolves.toEqual(cartWithIbuprofen);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cart/items/1",
      expect.objectContaining({ method: "PATCH", body: '{"quantity":3}' }),
    );
  });

  it("encodes the product id so it cannot change the path", async () => {
    const fetchMock = mockFetch(ok);

    await updateCartItem("1/../x", 1);

    expect(fetchMock.mock.calls[0]![0]).toBe("/api/cart/items/1%2F..%2Fx");
  });

  it("rejects with the server message", async () => {
    mockFetch({
      ok: false,
      status: 409,
      statusText: "Conflict",
      json: async () => ({ error: { message: "Only 3 in stock" } }),
    });

    await expect(updateCartItem("4", 5)).rejects.toMatchObject({
      status: 409,
      message: "Only 3 in stock",
    });
  });
});

describe("removeCartItem", () => {
  it("deletes one product from the cart", async () => {
    const fetchMock = mockFetch(ok);

    await expect(removeCartItem("1")).resolves.toEqual(cartWithIbuprofen);
    expect(fetchMock).toHaveBeenCalledWith("/api/cart/items/1", { method: "DELETE" });
  });
});
