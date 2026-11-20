import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import type { Order, OrderList, OrderParams } from "../schemas/orders.schema.js";
import { getOrder, listOrders, placeOrder } from "../services/orders.service.js";

export const create = asyncHandler(
  async (_req: Request, res: Response<Order, { userId: number }>) => {
    res.status(201).json(await placeOrder(res.locals.userId));
  },
);

export const list = asyncHandler(
  async (_req: Request, res: Response<OrderList, { userId: number }>) => {
    res.json(await listOrders(res.locals.userId));
  },
);

export const show = asyncHandler(
  async (_req: Request, res: Response<Order, { userId: number; params: OrderParams }>) => {
    res.json(await getOrder(res.locals.userId, res.locals.params.id));
  },
);
