import { Router } from "express";
import { getById, list } from "../controllers/products.controller.js";
import { validateParams } from "../middleware/validate.js";
import { productIdParamsSchema } from "../schemas/product.schema.js";

export const productsRouter = Router();

productsRouter.get("/", list);
productsRouter.get("/:id", validateParams(productIdParamsSchema), getById);
