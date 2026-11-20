import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import type {
  AddCartItemBody,
  Cart,
  CartItemParams,
  UpdateCartItemBody,
} from "../schemas/cart.schema.js";
import { addToCart, getCart, removeFromCart, updateCartItem } from "../services/cart.service.js";

export const show = asyncHandler(async (_req: Request, res: Response<Cart, { userId: number }>) => {
  res.json(await getCart(res.locals.userId));
});

export const addItem = asyncHandler(
  async (_req: Request, res: Response<Cart, { userId: number; body: AddCartItemBody }>) => {
    res.json(await addToCart(res.locals.userId, res.locals.body));
  },
);

export const updateItem = asyncHandler(
  async (
    _req: Request,
    res: Response<Cart, { userId: number; params: CartItemParams; body: UpdateCartItemBody }>,
  ) => {
    const { userId, params, body } = res.locals;
    res.json(await updateCartItem(userId, params.productId, body));
  },
);

export const removeItem = asyncHandler(
  async (_req: Request, res: Response<Cart, { userId: number; params: CartItemParams }>) => {
    res.json(await removeFromCart(res.locals.userId, res.locals.params.productId));
  },
);
