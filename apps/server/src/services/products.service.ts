import { AppError } from "../errors/AppError.js";
import { findProductById, listAllProducts } from "../db/products.repo.js";
import type { ProductDetail, ProductList } from "../schemas/product.schema.js";

export async function listProducts(list = listAllProducts): Promise<ProductList> {
  const items = await list();
  return { items, total: items.length };
}

export async function getProduct(id: number, find = findProductById): Promise<ProductDetail> {
  const product = await find(id);
  if (!product) throw new AppError(404, "Product not found");
  return product;
}
