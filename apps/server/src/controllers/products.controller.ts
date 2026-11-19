import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import type { ProductList } from "../schemas/product.schema.js";
import { listProducts } from "../services/products.service.js";

export const list = asyncHandler(async (_req: Request, res: Response<ProductList>) => {
  res.json(await listProducts());
});
