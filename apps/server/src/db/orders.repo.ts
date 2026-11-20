import { and, desc, eq, sql } from "drizzle-orm";
import type { Order, OrderItem, OrderSummary } from "../schemas/orders.schema.js";
import { db } from "./client.js";
import { cartItems, carts, orderItems, orders, products } from "./schema.js";

/** A cart line with the product fields an order needs, read under a lock. */
export interface OrderCandidate {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  stockQuantity: number;
  requiresPrescription: boolean;
}

export interface OrderDraft {
  total: number;
}

const money = (value: number) => value.toFixed(2);

/**
 * Turns the user's cart into an order in one transaction and empties the cart.
 * `prepare` sees the cart lines while the cart and products are locked; it returns the total, or
 * throws to reject the order (which rolls everything back). Returns the new order's id.
 */
export async function createOrderFromCart(
  userId: number,
  prepare: (lines: OrderCandidate[]) => OrderDraft,
): Promise<number> {
  return db.transaction(async (tx) => {
    // Locking the cart first makes a second concurrent order wait, then see an empty cart.
    const [cart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, userId))
      .for("update");

    const rows = cart
      ? await tx
          .select({
            productId: products.id,
            name: products.name,
            unitPrice: products.price,
            quantity: cartItems.quantity,
            stockQuantity: products.stockQuantity,
            requiresPrescription: products.requiresPrescription,
          })
          .from(cartItems)
          .innerJoin(products, eq(products.id, cartItems.productId))
          .where(eq(cartItems.cartId, cart.id))
          .orderBy(cartItems.createdAt, products.id)
          .for("update", { of: products })
      : [];

    const lines = rows.map((r) => ({ ...r, unitPrice: Number(r.unitPrice) }));
    const { total } = prepare(lines);

    const [order] = await tx
      .insert(orders)
      .values({ userId, total: money(total) })
      .returning({ id: orders.id });
    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId: order.id,
        productId: l.productId,
        name: l.name,
        unitPrice: money(l.unitPrice),
        quantity: l.quantity,
      })),
    );
    // `cart` is defined here: an empty (or missing) cart makes `prepare` throw first.
    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return order.id;
  });
}

const itemCount = sql<number>`coalesce(sum(${orderItems.quantity}), 0)::int`;

const summaryColumns = {
  id: orders.id,
  status: orders.status,
  total: orders.total,
  itemCount,
  createdAt: orders.createdAt,
};

function toSummary(row: {
  id: number;
  status: OrderSummary["status"];
  total: string;
  itemCount: number;
  createdAt: Date;
}): OrderSummary {
  return {
    id: row.id,
    status: row.status,
    // pg returns numeric as a string; 2-decimal money fits a JS number.
    total: Number(row.total),
    itemCount: row.itemCount,
    createdAt: row.createdAt.toISOString(),
  };
}

/** The user's orders, newest first. */
export async function findOrders(userId: number): Promise<OrderSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt), desc(orders.id));
  return rows.map(toSummary);
}

/** Null when the order does not exist or belongs to someone else. */
export async function findOrder(userId: number, orderId: number): Promise<Order | null> {
  const [row] = await db
    .select(summaryColumns)
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .groupBy(orders.id);
  if (!row) return null;
  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(orderItems.id);
  const items: OrderItem[] = itemRows.map((i) => {
    const unitPrice = Number(i.unitPrice);
    return {
      productId: i.productId === null ? null : String(i.productId),
      name: i.name,
      unitPrice,
      quantity: i.quantity,
      lineTotal: (Math.round(unitPrice * 100) * i.quantity) / 100,
    };
  });
  return { ...toSummary(row), items };
}
