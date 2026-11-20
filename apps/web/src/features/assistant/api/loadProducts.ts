import { fetchProduct, type ProductDetail } from "../../products";

export type LoadProduct = (id: string, signal: AbortSignal) => Promise<ProductDetail>;

/**
 * Loads products in parallel, in the given order. A product that fails to load is left out and counted
 * as unavailable, so one missing product doesn't sink the whole answer. An abort still rejects.
 */
export async function loadProducts(
  ids: string[],
  signal: AbortSignal,
  load: LoadProduct = fetchProduct,
): Promise<{ products: ProductDetail[]; unavailable: number }> {
  const results = await Promise.allSettled(ids.map((id) => load(id, signal)));
  signal.throwIfAborted();
  const products = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) console.warn(`${failed.length} suggested product(s) failed to load`);
  return { products, unavailable: failed.length };
}
