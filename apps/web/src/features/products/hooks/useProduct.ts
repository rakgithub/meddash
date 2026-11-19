import { useEffect, useState } from "react";
import { ApiError } from "../../../lib/apiClient";
import { fetchProduct } from "../api/fetchProduct";
import type { ProductDetail } from "../types";

export type ProductState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not-found" }
  | { status: "success"; product: ProductDetail };

type Settled = Exclude<ProductState, { status: "loading" }>;

/** Loads one product. Switching `id` goes back to loading without a synchronous state reset. */
export function useProduct(id: string): ProductState {
  // Tagged with its id, so a result for a previous id is ignored instead of reset in an effect.
  const [result, setResult] = useState<{ id: string; state: Settled } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProduct(id, controller.signal)
      .then((product) => setResult({ id, state: { status: "success", product } }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const notFound = err instanceof ApiError && err.status === 404;
        setResult({ id, state: { status: notFound ? "not-found" : "error" } });
      });
    return () => controller.abort();
  }, [id]);

  return result?.id === id ? result.state : { status: "loading" };
}
