import type { OrderStatus } from "../../types";
import { statusLabel } from "../../utils/orderFormat";
import styles from "./OrderStatusBadge.module.css";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={styles.badge} data-status={status}>
      {statusLabel(status)}
    </span>
  );
}
