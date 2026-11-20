import { Link } from "react-router-dom";
import { formatPrice } from "../../../products";
import { useCart } from "../../hooks/useCart";
import styles from "./CartPage.module.css";

/**
 * Read-only cart so "View cart" and the header link land somewhere real.
 * Changing quantities, removing lines and placing the order come with the full cart page.
 */
export function CartPage() {
  const { state } = useCart();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Your cart</h1>
      {(state.status === "loading" || state.status === "signed-out") && (
        <p className={styles.message}>Loading cart...</p>
      )}
      {state.status === "error" && (
        <p className={`${styles.message} ${styles.error}`}>
          Couldn&apos;t load your cart. Reload the page to try again.
        </p>
      )}
      {state.status === "ready" && state.cart.items.length === 0 && (
        <div className={styles.message}>
          <p>Your cart is empty.</p>
          <Link to="/">Browse products</Link>
        </div>
      )}
      {state.status === "ready" && state.cart.items.length > 0 && (
        <>
          <ul className={styles.lines}>
            {state.cart.items.map(({ product, quantity, lineTotal }) => (
              <li key={product.id} className={styles.line}>
                <Link className={styles.name} to={`/products/${product.id}`}>
                  {product.name}
                </Link>
                <span className={styles.qty}>
                  {quantity} × {formatPrice(product.price)}
                </span>
                <span className={styles.total}>{formatPrice(lineTotal)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.subtotal}>
            <span>
              Subtotal ({state.cart.itemCount} {state.cart.itemCount === 1 ? "item" : "items"})
            </span>
            <strong>{formatPrice(state.cart.subtotal)}</strong>
          </p>
        </>
      )}
    </div>
  );
}
