import { createContext } from "react";
import type { Order } from "../orders";
import type { Cart } from "./types";

export type CartState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; cart: Cart };

export interface CartContextValue {
  state: CartState;
  /** Adds to the server cart and takes the cart it answers with; rejects with the server's error. */
  addItem: (productId: string, quantity: number) => Promise<void>;
  /** Replaces a line's quantity; rejects with the server's error. */
  updateItem: (productId: string, quantity: number) => Promise<void>;
  /** Removes a line; rejects with the server's error. */
  removeItem: (productId: string) => Promise<void>;
  /** Orders the whole cart and empties it; resolves with the new order, rejects with the server's error. */
  placeOrder: () => Promise<Order>;
}

export const CartContext = createContext<CartContextValue | null>(null);
