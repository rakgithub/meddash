/** Mirrors `orderSchema` in apps/server/src/schemas/orders.schema.ts. */
export type OrderStatus = "pending_payment" | "paid" | "failed" | "cancelled";

export interface OrderSummary {
  id: number;
  status: OrderStatus;
  total: number;
  /** Sum of the quantities. */
  itemCount: number;
  /** ISO 8601. */
  createdAt: string;
}

export interface OrderItem {
  /** Null when the product was deleted since. */
  productId: string | null;
  /** Name and price as they were when the order was placed. */
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order extends OrderSummary {
  items: OrderItem[];
}
