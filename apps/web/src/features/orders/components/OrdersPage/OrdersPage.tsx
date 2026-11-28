import { Link } from "react-router-dom";
import { formatPrice } from "../../../products";
import { useOrders } from "../../hooks/useOrders";
import { formatOrderDate, itemLabel } from "../../utils/orderFormat";
import { OrderStatusBadge } from "../OrderStatusBadge/OrderStatusBadge";
import styles from "./OrdersPage.module.css";
import { PageTitle } from "../../../../lib/PageTitle";

/** The signed-in user's orders, newest first. Render under <RequireAuth>. */
export function OrdersPage() {
  const state = useOrders();

  return (
    <div className={styles.page}>
      <PageTitle title="Your orders" />
      <Link className={styles.back} to="/shop">
        ← Back to products
      </Link>
      <h1 className={styles.title}>Your orders</h1>

      {state.status === "loading" && <p className={styles.message}>Loading your orders…</p>}

      {state.status === "error" && (
        <p className={`${styles.message} ${styles.error}`} role="alert">
          Your orders could not be loaded. Reload the page to try again.
        </p>
      )}

      {state.status === "success" && state.orders.length === 0 && (
        <section className={styles.empty} aria-label="No orders">
          <p className={styles.emptyTitle}>No orders yet</p>
          <p className={styles.emptyText}>Orders you place show up here.</p>
          <Link className={styles.primary} to="/shop">
            Browse products
          </Link>
        </section>
      )}

      {state.status === "success" && state.orders.length > 0 && (
        <ul className={styles.list} aria-label="Orders">
          {state.orders.map((order) => (
            <li key={order.id}>
              <Link className={styles.order} to={`/orders/${order.id}`}>
                <span className={styles.number}>Order #{order.id}</span>
                <span className={styles.meta}>
                  {formatOrderDate(order.createdAt)} · {itemLabel(order.itemCount)}
                </span>
                <OrderStatusBadge status={order.status} />
                <span className={styles.total}>{formatPrice(order.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
