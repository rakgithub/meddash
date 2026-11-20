import { screen, within } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../lib/apiClient";
import { order } from "../../../../test/fixtures";
import * as api from "../../api/ordersApi";
import { OrderDetailPage } from "./OrderDetailPage";

vi.mock("../../api/ordersApi");

beforeEach(() => vi.resetAllMocks());

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/orders/7"]}>
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("OrderDetailPage", () => {
  it("shows loading, then the items, prices, total and status", async () => {
    vi.mocked(api.getOrder).mockResolvedValue(order);
    renderPage();
    expect(screen.getByText("Loading order…")).toBeVisible();

    expect(await screen.findByRole("heading", { name: "Order #7" })).toBeVisible();
    expect(api.getOrder).toHaveBeenCalledWith("7", expect.any(AbortSignal));
    expect(screen.getByText("Awaiting payment")).toBeVisible();
    expect(screen.getByText("Online payment is not available yet.")).toBeVisible();
    expect(screen.getByText("Placed 20.11.2026 · 3 items")).toBeVisible();

    const [ibuprofen] = within(screen.getByRole("list", { name: "Items" })).getAllByRole(
      "listitem",
    );
    expect(within(ibuprofen!).getByRole("link", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "href",
      "/products/1",
    );
    expect(ibuprofen).toHaveTextContent(/2 × 6,49\s€/);
    expect(ibuprofen).toHaveTextContent(/12,98\s€/);
    expect(screen.getByText("Total").parentElement).toHaveTextContent(/21,93\s€/);
  });

  it("shows a product that was deleted since as plain text, and no payment note once paid", async () => {
    vi.mocked(api.getOrder).mockResolvedValue({
      ...order,
      status: "paid",
      items: [{ ...order.items[0]!, productId: null }],
    });
    renderPage();

    expect(await screen.findByText("Ibuprofen 400mg")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Ibuprofen 400mg" })).not.toBeInTheDocument();
    expect(screen.queryByText("Online payment is not available yet.")).not.toBeInTheDocument();
  });

  it("says when the order is not found", async () => {
    vi.mocked(api.getOrder).mockRejectedValue(new ApiError(404, "Order not found"));
    renderPage();
    expect(await screen.findByText("Order not found")).toBeVisible();
  });

  it("shows an error when the order can't be loaded", async () => {
    vi.mocked(api.getOrder).mockRejectedValue(new Error("down"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load this order");
  });
});
