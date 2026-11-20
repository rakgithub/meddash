import { AppError } from "../errors/AppError.js";
import {
  addCartItem,
  findCartRows,
  removeCartItem,
  setCartItemQuantity,
  type CartRow,
} from "../db/cart.repo.js";
import { findProductById } from "../db/products.repo.js";
import {
  MAX_QUANTITY_PER_PRODUCT,
  type AddCartItemBody,
  type Cart,
  type UpdateCartItemBody,
} from "../schemas/cart.schema.js";
import type { ProductDetail } from "../schemas/product.schema.js";

const defaultStore = {
  findProduct: findProductById,
  findRows: findCartRows,
  addItem: addCartItem,
  setQuantity: setCartItemQuantity,
  removeItem: removeCartItem,
};

export type CartStore = typeof defaultStore;

/** Totals from the current prices; summed in cents so 0.1 + 0.2 style errors cannot creep in. */
export function buildCart(rows: CartRow[]): Cart {
  let itemCount = 0;
  let subtotalCents = 0;
  const items = rows.map(({ product, quantity }) => {
    const lineCents = Math.round(product.price * 100) * quantity;
    itemCount += quantity;
    subtotalCents += lineCents;
    return { product, quantity, lineTotal: lineCents / 100 };
  });
  return { items, itemCount, subtotal: subtotalCents / 100 };
}

/** The product, if it can be bought at all; otherwise the reason as an AppError. */
function purchasable(product: ProductDetail | null): ProductDetail {
  if (!product) throw new AppError(404, "Product not found");
  if (product.requiresPrescription) {
    throw new AppError(409, "Prescription-only products cannot be added to the cart");
  }
  if (product.stockQuantity === 0) throw new AppError(409, "This product is out of stock");
  return product;
}

function tooMany(stockQuantity: number): AppError {
  return stockQuantity < MAX_QUANTITY_PER_PRODUCT
    ? new AppError(409, `Only ${stockQuantity} in stock`)
    : new AppError(
        409,
        `You can have at most ${MAX_QUANTITY_PER_PRODUCT} of a product in your cart`,
      );
}

export async function getCart(userId: number, store = defaultStore): Promise<Cart> {
  return buildCart(await store.findRows(userId));
}

/** Adds to the quantity already in the cart. */
export async function addToCart(
  userId: number,
  { productId, quantity }: AddCartItemBody,
  store = defaultStore,
): Promise<Cart> {
  const { stockQuantity } = purchasable(await store.findProduct(productId));
  const limit = Math.min(MAX_QUANTITY_PER_PRODUCT, stockQuantity);
  if (quantity > limit || !(await store.addItem(userId, productId, quantity, limit))) {
    throw tooMany(stockQuantity);
  }
  return getCart(userId, store);
}

export async function updateCartItem(
  userId: number,
  productId: number,
  { quantity }: UpdateCartItemBody,
  store = defaultStore,
): Promise<Cart> {
  const { stockQuantity } = purchasable(await store.findProduct(productId));
  if (quantity > stockQuantity) throw tooMany(stockQuantity);
  if (!(await store.setQuantity(userId, productId, quantity))) {
    throw new AppError(404, "This product is not in your cart");
  }
  return getCart(userId, store);
}

export async function removeFromCart(
  userId: number,
  productId: number,
  store = defaultStore,
): Promise<Cart> {
  await store.removeItem(userId, productId);
  return getCart(userId, store);
}
