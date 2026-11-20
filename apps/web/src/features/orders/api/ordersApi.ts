import { apiGet, apiPost } from "../../../lib/apiClient";
import type { Order, OrderSummary } from "../types";

/** Turns the signed-in user's cart into an order; the server empties the cart. */
export function createOrder(): Promise<Order> {
  return apiPost<Order>("/orders", {});
}

/** The user's orders, newest first. */
export async function listOrders(signal?: AbortSignal): Promise<OrderSummary[]> {
  const { orders } = await apiGet<{ orders: OrderSummary[] }>("/orders", { signal });
  return orders;
}

export function getOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return apiGet<Order>(`/orders/${encodeURIComponent(id)}`, { signal });
}
