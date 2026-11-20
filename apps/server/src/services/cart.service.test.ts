import { describe, expect, it, vi } from "vitest";
import type { CartRow } from "../db/cart.repo.js";
import type { Product, ProductDetail } from "../schemas/product.schema.js";
import {
  addToCart,
  buildCart,
  getCart,
  removeFromCart,
  updateCartItem,
  type CartStore,
} from "./cart.service.js";

const product = (over: Partial<Product> = {}): Product => ({
  id: "1",
  name: "Ibuprofen 400mg",
  description: "Pain relief",
  category: "pain-relief",
  brand: "Nurofen",
  price: 6.49,
  imageUrl: null,
  ...over,
});

const detail = (over: Partial<ProductDetail> = {}): ProductDetail => ({
  ...product(),
  sku: null,
  pzn: null,
  packSize: null,
  dosageForm: null,
  activeIngredients: [],
  usageInstructions: null,
  warnings: null,
  requiresPrescription: false,
  stockQuantity: 50,
  manufacturer: null,
  ...over,
});

const fakeStore = (over: Partial<CartStore> = {}, rows: CartRow[] = []): CartStore => ({
  findProduct: async () => detail(),
  findRows: async () => rows,
  addItem: async () => true,
  setQuantity: async () => true,
  removeItem: async () => undefined,
  ...over,
});

describe("buildCart", () => {
  it("is empty with no rows", () => {
    expect(buildCart([])).toEqual({ items: [], itemCount: 0, subtotal: 0 });
  });

  it("totals lines and the cart without floating-point drift", () => {
    const cart = buildCart([
      { product: product({ price: 0.1 }), quantity: 3 },
      { product: product({ id: "2", price: 0.2 }), quantity: 1 },
    ]);
    expect(cart.items.map((i) => i.lineTotal)).toEqual([0.3, 0.2]);
    expect(cart.itemCount).toBe(4);
    expect(cart.subtotal).toBe(0.5);
  });
});

describe("getCart", () => {
  it("builds the cart from the user's rows", async () => {
    const findRows = vi.fn(async () => [{ product: product(), quantity: 2 }]);
    const cart = await getCart(5, fakeStore({ findRows }));
    expect(findRows).toHaveBeenCalledWith(5);
    expect(cart).toMatchObject({ itemCount: 2, subtotal: 12.98 });
  });
});

describe("addToCart", () => {
  it("adds with a limit of 10 when stock is plentiful", async () => {
    const addItem = vi.fn(async () => true);
    await addToCart(5, { productId: 1, quantity: 2 }, fakeStore({ addItem }));
    expect(addItem).toHaveBeenCalledWith(5, 1, 2, 10);
  });

  it("limits to the stock when it is below 10", async () => {
    const addItem = vi.fn(async () => true);
    const store = fakeStore({ addItem, findProduct: async () => detail({ stockQuantity: 3 }) });
    await addToCart(5, { productId: 1, quantity: 3 }, store);
    expect(addItem).toHaveBeenCalledWith(5, 1, 3, 3);
  });

  it.each([
    ["an unknown product", null, 404, "Product not found"],
    [
      "a prescription-only product",
      detail({ requiresPrescription: true }),
      409,
      "Prescription-only products cannot be added to the cart",
    ],
    ["an out-of-stock product", detail({ stockQuantity: 0 }), 409, "This product is out of stock"],
  ])("rejects %s", async (_label, found, statusCode, message) => {
    const addItem = vi.fn(async () => true);
    const store = fakeStore({ addItem, findProduct: async () => found });
    await expect(addToCart(5, { productId: 1, quantity: 1 }, store)).rejects.toMatchObject({
      statusCode,
      message,
    });
    expect(addItem).not.toHaveBeenCalled();
  });

  it("rejects more than the stock without touching the cart", async () => {
    const addItem = vi.fn(async () => true);
    const store = fakeStore({ addItem, findProduct: async () => detail({ stockQuantity: 3 }) });
    await expect(addToCart(5, { productId: 1, quantity: 4 }, store)).rejects.toMatchObject({
      statusCode: 409,
      message: "Only 3 in stock",
    });
    expect(addItem).not.toHaveBeenCalled();
  });

  it("rejects when the total with what is already in the cart is over 10", async () => {
    const store = fakeStore({ addItem: async () => false });
    await expect(addToCart(5, { productId: 1, quantity: 5 }, store)).rejects.toMatchObject({
      statusCode: 409,
      message: "You can have at most 10 of a product in your cart",
    });
  });
});

describe("updateCartItem", () => {
  it("sets the quantity and returns the cart", async () => {
    const setQuantity = vi.fn(async () => true);
    const rows = [{ product: product(), quantity: 4 }];
    const cart = await updateCartItem(5, 1, { quantity: 4 }, fakeStore({ setQuantity }, rows));
    expect(setQuantity).toHaveBeenCalledWith(5, 1, 4);
    expect(cart.itemCount).toBe(4);
  });

  it("rejects more than the stock", async () => {
    const store = fakeStore({ findProduct: async () => detail({ stockQuantity: 3 }) });
    await expect(updateCartItem(5, 1, { quantity: 4 }, store)).rejects.toMatchObject({
      statusCode: 409,
      message: "Only 3 in stock",
    });
  });

  it("returns 404 when the product is not in the cart", async () => {
    const store = fakeStore({ setQuantity: async () => false });
    await expect(updateCartItem(5, 1, { quantity: 1 }, store)).rejects.toMatchObject({
      statusCode: 404,
      message: "This product is not in your cart",
    });
  });
});

describe("removeFromCart", () => {
  it("removes the line and returns the cart", async () => {
    const removeItem = vi.fn(async () => undefined);
    const cart = await removeFromCart(5, 1, fakeStore({ removeItem }));
    expect(removeItem).toHaveBeenCalledWith(5, 1);
    expect(cart.items).toEqual([]);
  });
});
