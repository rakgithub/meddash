import { listAllProducts } from "../db/products.repo.js";
import type { ProductList } from "../schemas/product.schema.js";

export async function listProducts(list = listAllProducts): Promise<ProductList> {
  const items = await list();
  return { items, total: items.length };
}
