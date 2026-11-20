import { Router } from "express";
import { create, list, show } from "../controllers/orders.controller.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validateParams } from "../middleware/validate.js";
import { orderParamsSchema } from "../schemas/orders.schema.js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);
ordersRouter.post("/", create);
ordersRouter.get("/", list);
ordersRouter.get("/:id", validateParams(orderParamsSchema), show);
