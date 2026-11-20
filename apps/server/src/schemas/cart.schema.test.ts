import { describe, expect, it } from "vitest";
import {
  addCartItemBodySchema,
  cartItemParamsSchema,
  updateCartItemBodySchema,
} from "./cart.schema.js";

describe("addCartItemBodySchema", () => {
  it("turns the string product id into a number", () => {
    expect(addCartItemBodySchema.parse({ productId: "7", quantity: 2 })).toEqual({
      productId: 7,
      quantity: 2,
    });
  });

  it.each([
    ["a numeric id", { productId: 7, quantity: 1 }],
    ["id 0", { productId: "0", quantity: 1 }],
    ["a non-numeric id", { productId: "abc", quantity: 1 }],
    ["an id past the integer range", { productId: "9999999999", quantity: 1 }],
    ["quantity 0", { productId: "1", quantity: 0 }],
    ["quantity 11", { productId: "1", quantity: 11 }],
    ["a fractional quantity", { productId: "1", quantity: 1.5 }],
    ["a string quantity", { productId: "1", quantity: "2" }],
    ["a missing quantity", { productId: "1" }],
    ["an unknown field", { productId: "1", quantity: 1, price: 0.01 }],
  ])("rejects %s", (_label, body) => {
    expect(addCartItemBodySchema.safeParse(body).success).toBe(false);
  });
});

describe("updateCartItemBodySchema", () => {
  it("accepts 1 to 10", () => {
    expect(updateCartItemBodySchema.safeParse({ quantity: 1 }).success).toBe(true);
    expect(updateCartItemBodySchema.safeParse({ quantity: 10 }).success).toBe(true);
  });

  it.each([0, 11, -1, 2.5])("rejects quantity %s", (quantity) => {
    expect(updateCartItemBodySchema.safeParse({ quantity }).success).toBe(false);
  });
});

describe("cartItemParamsSchema", () => {
  it("coerces the path param", () => {
    expect(cartItemParamsSchema.parse({ productId: "3" })).toEqual({ productId: 3 });
  });

  it.each(["abc", "0", "1.5", "2147483648"])("rejects %s", (productId) => {
    expect(cartItemParamsSchema.safeParse({ productId }).success).toBe(false);
  });
});
