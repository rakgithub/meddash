import type { Request, Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import type { ProductDetail, ProductIdParams, ProductList } from "../schemas/product.schema.js";
import { getProduct, listProducts } from "../services/products.service.js";

export const list = asyncHandler(async (_req: Request, res: Response<ProductList>) => {
  res.json(await listProducts());
});

export const getById = asyncHandler(
  async (_req: Request, res: Response<ProductDetail, { params: ProductIdParams }>) => {
    res.json(await getProduct(res.locals.params.id));
  },
);
