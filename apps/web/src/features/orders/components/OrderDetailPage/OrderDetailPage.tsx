import { Button } from "@meddash/design-system/components";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { formatPrice } from "../../../products";
import { useOrder } from "../../hooks/useOrder";
import { formatOrderDate, itemLabel } from "../../utils/orderFormat";
import { OrderStatusBadge } from "../OrderStatusBadge/OrderStatusBadge";
import styles from "./OrderDetailPage.module.css";
import { PageTitle } from "../../../../lib/PageTitle";

interface OrderDetailPageProps {
  /** Offer "Back to the assistant" after placing: true while a conversation is live to go back to. */
  backToAssistant?: boolean;
}

/**
 * One order with its items and prices as placed. Right after Place order (`?placed=1`) it opens with
 * "Order placed". Render under <RequireAuth>.
 */
export function OrderDetailPage({ backToAssistant = false }: OrderDetailPageProps) {
  // The route is `/orders/:id`, so id is always present.
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const justPlaced = searchParams.get("placed") === "1";
  const state = useOrder(id);
  const OrderHeading = justPlaced ? "h2" : "h1";

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
          {justPlaced && (
            <section className={styles.placed} aria-labelledby="order-placed-title">
              <svg className={styles.tick} viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="21" />
                <path d="M15 24.5l6 6 12-13" pathLength="40" />
              </svg>
              <h1 id="order-placed-title" className={styles.placedTitle}>
                Order placed
              </h1>
              <p className={styles.placedLine}>
                Order #{state.order.id}, {formatPrice(state.order.total)}. Follow it under Orders.
              </p>
              {backToAssistant && (
                <Button href="/" size="lg">
                  Back to the assistant
                </Button>
              )}
            </section>
          )}
          <div className={styles.head}>
            <OrderHeading className={styles.title}>Order #{state.order.id}</OrderHeading>
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
