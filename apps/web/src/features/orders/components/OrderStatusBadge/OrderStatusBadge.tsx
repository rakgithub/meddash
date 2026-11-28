import { Badge } from "@meddash/design-system/components";
import type { OrderStatus } from "../../types";
import { statusLabel } from "../../utils/orderFormat";

const TONES: Record<OrderStatus, "neutral" | "accent" | "caution" | "danger"> = {
  pending_payment: "caution",
  paid: "accent",
  failed: "danger",
  cancelled: "neutral",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={TONES[status]}>{statusLabel(status)}</Badge>;
}
