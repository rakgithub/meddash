import { useEffect, useState } from "react";
import { listOrders } from "../api/ordersApi";
import type { OrderSummary } from "../types";

export type OrdersState =
  { status: "loading" } | { status: "error" } | { status: "success"; orders: OrderSummary[] };

export function useOrders(): OrdersState {
  const [state, setState] = useState<OrdersState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    listOrders(controller.signal)
      .then((orders) => setState({ status: "success", orders }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, []);

  return state;
}
