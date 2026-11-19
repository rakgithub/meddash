import { apiGet } from "../../../lib/apiClient";
import type { ProductDetail } from "../types";

export function fetchProduct(id: string, signal?: AbortSignal): Promise<ProductDetail> {
  return apiGet<ProductDetail>(`/products/${encodeURIComponent(id)}`, { signal });
}
