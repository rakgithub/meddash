import { Link } from "react-router-dom";
import { useCart } from "../../../cart";
import { formatPrice } from "../../../products";
import styles from "./CartBar.module.css";

const itemLabel = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;

/** "2 items · €10.98 · Checkout" above the message box once the cart has something in it. */
export function CartBar() {
  const { state } = useCart();
  const cart = state.status === "ready" && state.cart.itemCount > 0 ? state.cart : null;
  const summary = cart ? `${itemLabel(cart.itemCount)}, ${formatPrice(cart.subtotal)}` : "";

  return (
    <>
      {cart && (
        <Link className={styles.bar} to="/cart">
          <span className="visually-hidden">Cart:</span> <span>{itemLabel(cart.itemCount)}</span>{" "}
          <span aria-hidden="true">·</span>{" "}
          <span className={styles.subtotal}>{formatPrice(cart.subtotal)}</span>{" "}
          <span className={styles.checkout}>Checkout</span>
        </Link>
      )}
      {/* Always rendered, so the change is announced when something is added from a row above. */}
      <p className="visually-hidden" role="status">
        {summary && `Cart: ${summary}`}
      </p>
    </>
  );
}
