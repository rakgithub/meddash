import { Link, useParams } from "react-router-dom";
import { formatPrice } from "../../../products";
import { useOrder } from "../../hooks/useOrder";
import { formatOrderDate, itemLabel } from "../../utils/orderFormat";
import { OrderStatusBadge } from "../OrderStatusBadge/OrderStatusBadge";
import styles from "./OrderDetailPage.module.css";
import { PageTitle } from "../../../../lib/PageTitle";

/** One order with its items and prices as placed. Render under <RequireAuth>. */
export function OrderDetailPage() {
  // The route is `/orders/:id`, so id is always present.
  const { id = "" } = useParams();
  const state = useOrder(id);

  return (
    <div className={styles.page}>
      <PageTitle title={state.status === "not-found" ? "Order not found" : `Order #${id}`} />
      <Link className={styles.back} to="/orders">
        ← All orders
      </Link>

      {state.status === "loading" && <p className={styles.message}>Loading order…</p>}
      {state.status === "error" && (
        <p className={`${styles.message} ${styles.error}`} role="alert">
          Could not load this order.
        </p>
      )}
      {state.status === "not-found" && <p className={styles.message}>Order not found</p>}

      {state.status === "success" && (
        <>
          <div className={styles.head}>
            <h1 className={styles.title}>Order #{state.order.id}</h1>
            <OrderStatusBadge status={state.order.status} />
          </div>
          <p className={styles.meta}>
            Placed {formatOrderDate(state.order.createdAt)} · {itemLabel(state.order.itemCount)}
          </p>
          {state.order.status === "pending_payment" && (
            <p className={styles.note}>Online payment is not available yet.</p>
          )}

          <ul className={styles.items} aria-label="Items">
            {state.order.items.map((item, index) => (
              <li key={index} className={styles.item}>
                <span className={styles.name}>
                  {item.productId === null ? (
                    item.name
                  ) : (
                    <Link to={`/products/${item.productId}`}>{item.name}</Link>
                  )}
                </span>
                <span className={styles.calc}>
                  {item.quantity} × {formatPrice(item.unitPrice)}
                </span>
                <span className={styles.line}>{formatPrice(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <p className={styles.total}>
            <span>Total</span>
            <span>{formatPrice(state.order.total)}</span>
          </p>
        </>
      )}
    </div>
  );
}
