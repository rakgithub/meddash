import { Router } from "express";
import { addItem, removeItem, show, updateItem } from "../controllers/cart.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import {
  addCartItemBodySchema,
  cartItemParamsSchema,
  updateCartItemBodySchema,
} from "../schemas/cart.schema.js";

export const cartRouter = Router();

cartRouter.use(requireAuth);
cartRouter.get("/", show);
cartRouter.post("/items", validateBody(addCartItemBodySchema), addItem);
cartRouter.patch(
  "/items/:productId",
  validateParams(cartItemParamsSchema),
  validateBody(updateCartItemBodySchema),
  updateItem,
);
cartRouter.delete("/items/:productId", validateParams(cartItemParamsSchema), removeItem);
