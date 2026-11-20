import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../../auth";
import { addToCart, getCart, removeCartItem, updateCartItem } from "../../api/cartApi";
import type { Cart } from "../../types";
import { CartContext, type CartState } from "../../cartContext";

/** What was last loaded, and for whom: a different (or no) user makes it stale without an effect. */
interface Loaded {
  userId: string;
  state: Extract<CartState, { status: "ready" | "error" }>;
}

/** The signed-in user's server cart, shared by the header count, the detail page and the cart page. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { state: auth } = useAuth();
  const userId = auth.status === "signed-in" ? auth.user.id : null;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    getCart(controller.signal)
      .then((cart) => setLoaded({ userId, state: { status: "ready", cart } }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoaded({ userId, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [userId]);

  let state: CartState;
  if (auth.status === "signed-out") state = { status: "signed-out" };
  else if (loaded && loaded.userId === userId) state = loaded.state;
  else state = { status: "loading" };

  /** Every cart endpoint answers with the whole cart, which becomes the shared state. */
  const apply = async (request: () => Promise<Cart>) => {
    if (!userId) throw new Error("Log in to change your cart");
    const cart = await request();
    setLoaded({ userId, state: { status: "ready", cart } });
  };

  const value = {
    state,
    addItem: (productId: string, quantity: number) => apply(() => addToCart(productId, quantity)),
    updateItem: (productId: string, quantity: number) =>
      apply(() => updateCartItem(productId, quantity)),
    removeItem: (productId: string) => apply(() => removeCartItem(productId)),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
