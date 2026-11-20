import { AppError } from "../errors/AppError.js";
import {
  createOrderFromCart,
  findOrder,
  findOrders,
  type OrderCandidate,
  type OrderDraft,
} from "../db/orders.repo.js";
import type { Order, OrderList } from "../schemas/orders.schema.js";

const defaultStore = { createFromCart: createOrderFromCart, findOrder, findOrders };

export type OrdersStore = typeof defaultStore;

/**
 * Re-checks the cart lines against the current catalogue and prices them; throws a 409 AppError
 * for an empty cart or a line that can no longer be bought. Summed in cents, like the cart.
 */
export function prepareOrder(lines: OrderCandidate[]): OrderDraft {
  if (lines.length === 0) throw new AppError(409, "Your cart is empty");
  let totalCents = 0;
  for (const line of lines) {
    if (line.requiresPrescription) {
      throw new AppError(409, `${line.name} is prescription-only and cannot be ordered`);
    }
    if (line.stockQuantity < line.quantity) {
      throw new AppError(
        409,
        line.stockQuantity === 0
          ? `${line.name} is out of stock`
          : `Only ${line.stockQuantity} of ${line.name} in stock`,
      );
    }
    totalCents += Math.round(line.unitPrice * 100) * line.quantity;
  }
  return { total: totalCents / 100 };
}

export async function placeOrder(userId: number, store = defaultStore): Promise<Order> {
  const id = await store.createFromCart(userId, prepareOrder);
  const order = await store.findOrder(userId, id);
  if (!order) throw new Error(`Order ${id} missing right after it was created`);
  return order;
}

export async function listOrders(userId: number, store = defaultStore): Promise<OrderList> {
  return { orders: await store.findOrders(userId) };
}

export async function getOrder(
  userId: number,
  orderId: number,
  store = defaultStore,
): Promise<Order> {
  const order = await store.findOrder(userId, orderId);
  if (!order) throw new AppError(404, "Order not found");
  return order;
}
