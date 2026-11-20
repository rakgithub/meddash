import { describe, expect, it, vi } from "vitest";
import type { OrderCandidate } from "../db/orders.repo.js";
import type { Order } from "../schemas/orders.schema.js";
import {
  getOrder,
  listOrders,
  placeOrder,
  prepareOrder,
  type OrdersStore,
} from "./orders.service.js";

const line = (over: Partial<OrderCandidate> = {}): OrderCandidate => ({
  productId: 1,
  name: "Ibuprofen 400mg",
  unitPrice: 6.49,
  quantity: 2,
  stockQuantity: 50,
  requiresPrescription: false,
  ...over,
});

const order: Order = {
  id: 7,
  status: "pending_payment",
  total: 12.98,
  itemCount: 2,
  createdAt: "2026-11-20T10:00:00.000Z",
  items: [],
};

describe("prepareOrder", () => {
  it("sums the total in cents", () => {
    const total = prepareOrder([
      line({ unitPrice: 0.1, quantity: 1 }),
      line({ unitPrice: 0.2, quantity: 1 }),
    ]).total;
    expect(total).toBe(0.3);
  });

  it("rejects an empty cart with 409", () => {
    expect(() => prepareOrder([])).toThrowError(
      expect.objectContaining({ statusCode: 409, message: "Your cart is empty" }),
    );
  });

  it.each([
    ["prescription-only", { requiresPrescription: true }, /prescription-only/],
    ["out of stock", { stockQuantity: 0 }, /out of stock/],
    ["short on stock", { stockQuantity: 1 }, /Only 1 of Ibuprofen 400mg in stock/],
  ])("rejects a line that is %s", (_name, over, message) => {
    expect(() => prepareOrder([line(over)])).toThrowError(
      expect.objectContaining({ statusCode: 409, message: expect.stringMatching(message) }),
    );
  });
});

describe("placeOrder / listOrders / getOrder", () => {
  const store = (over: Partial<OrdersStore> = {}): OrdersStore => ({
    createFromCart: async () => 7,
    findOrder: async () => order,
    findOrders: async () => [],
    ...over,
  });

  it("creates with prepareOrder and returns the stored order", async () => {
    const createFromCart = vi.fn(async () => 7);
    expect(await placeOrder(3, store({ createFromCart }))).toEqual(order);
    expect(createFromCart).toHaveBeenCalledWith(3, prepareOrder);
  });

  it("lists the orders", async () => {
    expect(await listOrders(3, store({ findOrders: async () => [order] }))).toEqual({
      orders: [order],
    });
  });

  it("returns 404 for a missing order", async () => {
    await expect(getOrder(3, 9, store({ findOrder: async () => null }))).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("returns the order when found", async () => {
    expect(await getOrder(3, 7, store())).toEqual(order);
  });
});
