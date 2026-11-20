import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../../../auth";
import { addToCart, getCart } from "../../api/cartApi";
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

  const addItem = async (productId: string, quantity: number) => {
    if (!userId) throw new Error("Log in to add to your cart");
    const cart = await addToCart(productId, quantity);
    setLoaded({ userId, state: { status: "ready", cart } });
  };

  return <CartContext.Provider value={{ state, addItem }}>{children}</CartContext.Provider>;
}
