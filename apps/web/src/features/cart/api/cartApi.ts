import { apiDelete, apiGet, apiPatch, apiPost } from "../../../lib/apiClient";
import type { Cart } from "../types";

const itemPath = (productId: string) => `/cart/items/${encodeURIComponent(productId)}`;

export function getCart(signal?: AbortSignal): Promise<Cart> {
  return apiGet<Cart>("/cart", { signal });
}

/** Adds to the quantity already in the cart; answers with the whole cart. */
export function addToCart(productId: string, quantity: number): Promise<Cart> {
  return apiPost<Cart>("/cart/items", { productId, quantity });
}

/** Replaces the quantity of a line; answers with the whole cart. */
export function updateCartItem(productId: string, quantity: number): Promise<Cart> {
  return apiPatch<Cart>(itemPath(productId), { quantity });
}

export function removeCartItem(productId: string): Promise<Cart> {
  return apiDelete<Cart>(itemPath(productId));
}
