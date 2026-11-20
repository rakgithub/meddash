import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { orderSummary } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import * as api from "../../api/ordersApi";
import { OrdersPage } from "./OrdersPage";

vi.mock("../../api/ordersApi");

beforeEach(() => vi.resetAllMocks());

describe("OrdersPage", () => {
  it("shows loading, then each order as a link with its summary", async () => {
    vi.mocked(api.listOrders).mockResolvedValue([
      orderSummary,
      { ...orderSummary, id: 6, status: "paid", itemCount: 1, total: 6.49 },
    ]);
    renderWithRouter(<OrdersPage />, "/orders");
    expect(screen.getByText("Loading your orders…")).toBeVisible();

    const list = await screen.findByRole("list", { name: "Orders" });
    const [first, second] = within(list).getAllByRole("link");
    expect(first).toHaveAttribute("href", "/orders/7");
    expect(first).toHaveTextContent("Order #7");
    expect(first).toHaveTextContent("20.11.2026 · 3 items");
    expect(first).toHaveTextContent("Awaiting payment");
    expect(first).toHaveTextContent(/21,93\s€/);
    expect(second).toHaveAttribute("href", "/orders/6");
    expect(second).toHaveTextContent("1 item");
    expect(second).toHaveTextContent("Paid");
  });

  it("shows the empty state with a way back to products", async () => {
    vi.mocked(api.listOrders).mockResolvedValue([]);
    renderWithRouter(<OrdersPage />, "/orders");

    const empty = await screen.findByRole("region", { name: "No orders" });
    expect(empty).toHaveTextContent("No orders yet");
    expect(within(empty).getByRole("link", { name: "Browse products" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows an error when the orders can't be loaded", async () => {
    vi.mocked(api.listOrders).mockRejectedValue(new Error("down"));
    renderWithRouter(<OrdersPage />, "/orders");

    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  });
});
