import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../../../lib/apiClient";
import { formatPrice } from "../../../products";
import { getCart, removeCartItem, updateCartItem } from "../../api/cartApi";
import type { Cart } from "../../types";
import { CartLineItem, type LinePending } from "../CartLineItem/CartLineItem";
import styles from "./CartPage.module.css";

type LoadState = { status: "loading" } | { status: "error" } | { status: "ready"; cart: Cart };

const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : "Could not reach the server. Try again.";

const itemLabel = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

/** The signed-in user's cart. Render under <RequireAuth>. */
export function CartPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Every response is the whole cart, so mutations run one at a time: a slower earlier
  // response can't then overwrite a newer one.
  const [pending, setPending] = useState<{ productId: string; action: LinePending } | null>(null);
  const [lineError, setLineError] = useState<{ productId: string; message: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getCart(controller.signal)
      .then((cart) => setState({ status: "ready", cart }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const mutate = async (productId: string, action: LinePending, request: () => Promise<Cart>) => {
    setPending({ productId, action });
    setLineError(null);
    try {
      const cart = await request();
      setState({ status: "ready", cart });
    } catch (err) {
      setLineError({ productId, message: errorMessage(err) });
    } finally {
      setPending(null);
    }
  };

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  return (
    <div className={styles.page}>
      <Link className={styles.back} to="/">
        ← Back to products
      </Link>
      <h1 className={styles.title}>Your cart</h1>

      {state.status === "loading" && <p className={styles.message}>Loading your cart…</p>}

      {state.status === "error" && (
        <div className={styles.message} role="alert">
          <p>Your cart could not be loaded.</p>
          <button type="button" className={styles.secondary} onClick={retry}>
            Try again
          </button>
        </div>
      )}

      {state.status === "ready" && state.cart.items.length === 0 && (
        <section className={styles.empty} aria-label="Empty cart">
          <span className={styles.emptyWell} aria-hidden="true" />
          <p className={styles.emptyTitle}>Your cart is empty</p>
          <p className={styles.emptyText}>Find what you need and add it from the product page.</p>
          <Link className={styles.primary} to="/">
            Browse products
          </Link>
        </section>
      )}

      {state.status === "ready" && state.cart.items.length > 0 && (
        <div className={styles.layout}>
          <ul className={styles.lines} aria-label="Cart items">
            {state.cart.items.map((line) => {
              const { id } = line.product;
              const ownPending = pending?.productId === id ? pending.action : null;
              return (
                <li key={id} className={styles.lineItem}>
                  <CartLineItem
                    line={line}
                    pending={ownPending}
                    locked={pending !== null && ownPending === null}
                    error={lineError?.productId === id ? lineError.message : null}
                    onQuantityChange={(quantity) =>
                      mutate(id, "update", () => updateCartItem(id, quantity))
                    }
                    onRemove={() => mutate(id, "remove", () => removeCartItem(id))}
                  />
                </li>
              );
            })}
          </ul>

          <section className={styles.summary} aria-labelledby="cart-summary-title">
            <h2 id="cart-summary-title" className={styles.summaryTitle}>
              Order summary
            </h2>
            <dl className={styles.totals}>
              <div className={styles.row}>
                <dt>Items</dt>
                <dd>{itemLabel(state.cart.itemCount)}</dd>
              </div>
              <div className={`${styles.row} ${styles.subtotal}`}>
                <dt>Subtotal</dt>
                <dd>{formatPrice(state.cart.subtotal)}</dd>
              </div>
            </dl>
            {/* Orders arrive in the next change (PR 5); until then the button explains itself. */}
            <button
              type="button"
              className={styles.primary}
              disabled
              aria-describedby="place-order-note"
            >
              Place order
            </button>
            <p id="place-order-note" className={styles.note}>
              Ordering opens soon. Your cart is saved to your account.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
