import type { OrderStatus } from "../types";

const dateFormatter = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });

const statusLabels: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  failed: "Payment failed",
  cancelled: "Cancelled",
};

export const statusLabel = (status: OrderStatus) => statusLabels[status];

export const formatOrderDate = (iso: string) => dateFormatter.format(new Date(iso));

export const itemLabel = (count: number) => `${count} ${count === 1 ? "item" : "items"}`;
