import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Product } from "../schemas/product.schema.js";
import { db } from "./client.js";
import { toProduct } from "./products.repo.js";
import { cartItems, carts, products } from "./schema.js";

export interface CartRow {
  product: Product;
  quantity: number;
}

const cartIdOf = (userId: number) =>
  db.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));

/** The user's cart lines in the order they were added; empty when the user has no cart yet. */
export async function findCartRows(userId: number): Promise<CartRow[]> {
  const rows = await db
    .select({ product: products, quantity: cartItems.quantity })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(carts.userId, userId))
    .orderBy(asc(cartItems.createdAt), asc(products.id));
  return rows.map((r) => ({ product: toProduct(r.product), quantity: r.quantity }));
}

/**
 * Adds `quantity` to the line (creating the cart and line as needed), unless the new total would
 * exceed `limit`. Returns false when it would. The limit is checked in the same statement, so two
 * concurrent adds cannot both pass it.
 */
export async function addCartItem(
  userId: number,
  productId: number,
  quantity: number,
  limit: number,
): Promise<boolean> {
  // DO UPDATE rather than DO NOTHING, so RETURNING also gives the id of an existing cart.
  const [cart] = await db
    .insert(carts)
    .values({ userId })
    .onConflictDoUpdate({ target: carts.userId, set: { updatedAt: new Date() } })
    .returning({ id: carts.id });
  const newQuantity = sql`${cartItems.quantity} + excluded.quantity`;
  const rows = await db
    .insert(cartItems)
    .values({ cartId: cart.id, productId, quantity })
    .onConflictDoUpdate({
      target: [cartItems.cartId, cartItems.productId],
      set: { quantity: newQuantity, updatedAt: new Date() },
      setWhere: sql`${newQuantity} <= ${limit}`,
    })
    .returning({ quantity: cartItems.quantity });
  return rows.length > 0;
}

/** Returns false when the product is not in the user's cart. */
export async function setCartItemQuantity(
  userId: number,
  productId: number,
  quantity: number,
): Promise<boolean> {
  const rows = await db
    .update(cartItems)
    .set({ quantity })
    .where(and(inArray(cartItems.cartId, cartIdOf(userId)), eq(cartItems.productId, productId)))
    .returning({ quantity: cartItems.quantity });
  return rows.length > 0;
}

/** Removing a product that is not in the cart is not an error. */
export async function removeCartItem(userId: number, productId: number): Promise<void> {
  await db
    .delete(cartItems)
    .where(and(inArray(cartItems.cartId, cartIdOf(userId)), eq(cartItems.productId, productId)));
}
