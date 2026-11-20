import { apiDelete, apiGet, apiPatch } from "../../../lib/apiClient";
import type { Cart } from "../types";

const itemPath = (productId: string) => `/cart/items/${encodeURIComponent(productId)}`;

export function getCart(signal?: AbortSignal): Promise<Cart> {
  return apiGet<Cart>("/cart", { signal });
}

/** Replaces the quantity of a product already in the cart. */
export function updateCartItem(productId: string, quantity: number): Promise<Cart> {
  return apiPatch<Cart>(itemPath(productId), { quantity });
}

export function removeCartItem(productId: string): Promise<Cart> {
  return apiDelete<Cart>(itemPath(productId));
}
