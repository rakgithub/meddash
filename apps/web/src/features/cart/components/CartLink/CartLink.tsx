import { Badge } from "@meddash/design-system/components";
import { NavLink } from "react-router-dom";
import { useCart } from "../../hooks/useCart";
import styles from "./CartLink.module.css";

/** Header link to the cart; shows the item count once it is known. */
export function CartLink() {
  const { state } = useCart();
  const count = state.status === "ready" ? state.cart.itemCount : null;
  const items = count === null ? "" : `${count} ${count === 1 ? "item" : "items"}`;

  return (
    <NavLink className={styles.link} to="/cart" aria-label={items ? `Cart, ${items}` : "Cart"}>
      <span className={styles.icon}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 4h2.2l2.1 10.4a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.3" />
          <circle cx="9.5" cy="19.5" r="1.3" />
          <circle cx="17" cy="19.5" r="1.3" />
        </svg>
        {count !== null && count > 0 && (
          <span className={styles.badge}>
            <Badge variant="count" label={items}>
              {count}
            </Badge>
          </span>
        )}
      </span>
      <span className={styles.label}>Cart</span>
    </NavLink>
  );
}
