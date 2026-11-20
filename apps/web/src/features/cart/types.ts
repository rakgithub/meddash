import type { Product } from "../products";

/** Mirrors `cartSchema` in apps/server/src/schemas/cart.schema.ts. */
export interface CartLine {
  product: Product;
  quantity: number;
  /** Current price times quantity. */
  lineTotal: number;
}

export interface Cart {
  items: CartLine[];
  /** Sum of the quantities. */
  itemCount: number;
  subtotal: number;
}

/** The server rejects more than this per product, and more than the stock. */
export const MAX_QUANTITY_PER_PRODUCT = 10;
