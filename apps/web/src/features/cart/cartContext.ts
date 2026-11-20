import { createContext } from "react";
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
}

export const CartContext = createContext<CartContextValue | null>(null);
