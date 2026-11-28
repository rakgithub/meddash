import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../../../lib/apiClient";
import { formatPrice } from "../../../products";
import { useCart } from "../../hooks/useCart";
import { CartLineItem, type LinePending } from "../CartLineItem/CartLineItem";
import styles from "./CartPage.module.css";
import { PageTitle } from "../../../../lib/PageTitle";

const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : "Could not reach the server. Try again.";

const itemLabel = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

/** The signed-in user's cart, from <CartProvider>. Render under <RequireAuth>. */
export function CartPage() {
  const { state, updateItem, removeItem, placeOrder } = useCart();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  // Every response is the whole cart, so mutations run one at a time: a slower earlier
  // response can't then overwrite a newer one.
  const [pending, setPending] = useState<{ productId: string; action: LinePending } | null>(null);
  const [lineError, setLineError] = useState<{ productId: string; message: string } | null>(null);

  const mutate = async (productId: string, action: LinePending, request: () => Promise<void>) => {
    setPending({ productId, action });
    setLineError(null);
    try {
      await request();
    } catch (err) {
      setLineError({ productId, message: errorMessage(err) });
    } finally {
      setPending(null);
    }
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    setOrderError(null);
    try {
      navigate(`/orders/${await placeOrder()}`);
    } catch (err) {
      setOrderError(errorMessage(err));
      setPlacing(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageTitle title="Your cart" />
      <Link className={styles.back} to="/">
        ← Back to products
      </Link>
      <h1 className={styles.title}>Your cart</h1>

      {(state.status === "loading" || state.status === "signed-out") && (
        <p className={styles.message}>Loading your cart…</p>
      )}

      {state.status === "error" && (
        <p className={`${styles.message} ${styles.error}`} role="alert">
          Your cart could not be loaded. Reload the page to try again.
        </p>
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
                      mutate(id, "update", () => updateItem(id, quantity))
                    }
                    onRemove={() => mutate(id, "remove", () => removeItem(id))}
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
            <button
              type="button"
              className={styles.primary}
              disabled={placing || pending !== null}
              onClick={handlePlaceOrder}
            >
              {placing ? "Placing order…" : "Place order"}
            </button>
            {orderError && (
              <p className={`${styles.note} ${styles.error}`} role="alert">
                {orderError}
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
