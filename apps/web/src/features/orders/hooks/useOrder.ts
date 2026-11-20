import { useEffect, useState } from "react";
import { ApiError } from "../../../lib/apiClient";
import { getOrder } from "../api/ordersApi";
import type { Order } from "../types";

export type OrderState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "not-found" }
  | { status: "success"; order: Order };

type Settled = Exclude<OrderState, { status: "loading" }>;

/** Loads one order. Switching `id` goes back to loading without a synchronous state reset. */
export function useOrder(id: string): OrderState {
  // Tagged with its id, so a result for a previous id is ignored instead of reset in an effect.
  const [result, setResult] = useState<{ id: string; state: Settled } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getOrder(id, controller.signal)
      .then((order) => setResult({ id, state: { status: "success", order } }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const notFound = err instanceof ApiError && err.status === 404;
        setResult({ id, state: { status: notFound ? "not-found" : "error" } });
      });
    return () => controller.abort();
  }, [id]);

  return result?.id === id ? result.state : { status: "loading" };
}
