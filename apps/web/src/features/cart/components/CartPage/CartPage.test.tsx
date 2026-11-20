import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApiError } from "../../../../lib/apiClient";
import type { Order } from "../../../orders";
import { AuthProvider } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import {
  ana,
  cartWithIbuprofen,
  cartWithTwoLines,
  emptyCart,
  order,
} from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import * as ordersApi from "../../../orders/api/ordersApi";
import * as cartApi from "../../api/cartApi";
import { CartProvider } from "../CartProvider/CartProvider";
import { CartPage } from "./CartPage";

vi.mock("../../../auth/api/authApi");
vi.mock("../../api/cartApi");
vi.mock("../../../orders/api/ordersApi");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
});

const renderPage = () =>
  renderWithRouter(
    <AuthProvider>
      <CartProvider>
        <CartPage />
      </CartProvider>
    </AuthProvider>,
    "/cart",
  );

const line = (name: string) => within(screen.getByRole("article", { name }));
const summary = () => within(screen.getByRole("region", { name: "Order summary" }));

/** A promise the test settles by hand, to look at the page while a request is in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("CartPage", () => {
  it("shows loading, then the lines and summary", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithTwoLines);
    renderPage();

    expect(screen.getByText("Loading your cart…")).toBeVisible();
    expect(await screen.findByRole("heading", { name: "Ibuprofen 400mg" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Vitamin D3 1000 IU" })).toBeVisible();
    expect(summary().getByText("3 items")).toBeVisible();
    expect(summary().getByText(/21,93\s€/)).toBeVisible();
    expect(summary().getByRole("button", { name: "Place order" })).toBeEnabled();
  });

  it("says 1 item in the singular", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue({
      ...cartWithIbuprofen,
      items: [{ ...cartWithIbuprofen.items[0]!, quantity: 1 }],
      itemCount: 1,
    });
    renderPage();
    expect(await screen.findByText("1 item")).toBeVisible();
  });

  it("shows the empty state with a way back to products", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(emptyCart);
    renderPage();

    const empty = await screen.findByRole("region", { name: "Empty cart" });
    expect(empty).toHaveTextContent("Your cart is empty");
    expect(within(empty).getByRole("link", { name: "Browse products" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("shows an error when the cart can't be loaded", async () => {
    vi.mocked(cartApi.getCart).mockRejectedValue(new ApiError(500, "Internal Server Error"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Your cart could not be loaded.");
  });

  it("updates a quantity and shows the cart from the response", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithTwoLines);
    const request = deferred<typeof cartWithTwoLines>();
    vi.mocked(cartApi.updateCartItem).mockReturnValue(request.promise);
    renderPage();

    await screen.findByRole("heading", { name: "Ibuprofen 400mg" });
    await userEvent.click(
      line("Ibuprofen 400mg").getByRole("button", { name: "Increase quantity" }),
    );

    expect(cartApi.updateCartItem).toHaveBeenCalledWith("1", 3);
    expect(line("Ibuprofen 400mg").getByRole("status")).toHaveTextContent("Updating quantity…");
    // Other lines wait, so responses can't arrive out of order.
    expect(line("Vitamin D3 1000 IU").getByRole("button", { name: "Remove" })).toBeDisabled();

    request.resolve({
      items: [
        { ...cartWithTwoLines.items[0]!, quantity: 3, lineTotal: 19.47 },
        cartWithTwoLines.items[1]!,
      ],
      itemCount: 4,
      subtotal: 28.42,
    });

    expect(await summary().findByText("4 items")).toBeVisible();
    expect(line("Ibuprofen 400mg").getByRole("spinbutton")).toHaveValue(3);
    expect(line("Ibuprofen 400mg").getByText(/19,47\s€/)).toBeVisible();
    expect(line("Vitamin D3 1000 IU").getByRole("button", { name: "Remove" })).toBeEnabled();
  });

  it("shows the server's error on the line and keeps the quantity", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithTwoLines);
    vi.mocked(cartApi.updateCartItem).mockRejectedValue(new ApiError(409, "Only 2 in stock"));
    renderPage();

    await screen.findByRole("heading", { name: "Ibuprofen 400mg" });
    await userEvent.click(
      line("Ibuprofen 400mg").getByRole("button", { name: "Increase quantity" }),
    );

    expect(await line("Ibuprofen 400mg").findByRole("alert")).toHaveTextContent("Only 2 in stock");
    expect(line("Ibuprofen 400mg").getByRole("spinbutton")).toHaveValue(2);
    expect(line("Vitamin D3 1000 IU").queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a generic error when the server can't be reached", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    vi.mocked(cartApi.removeCartItem).mockRejectedValue(new TypeError("Failed to fetch"));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server.");
    expect(screen.getByRole("heading", { name: "Ibuprofen 400mg" })).toBeVisible();
  });

  it("removes a line, then shows the empty state after the last one", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithTwoLines);
    vi.mocked(cartApi.removeCartItem)
      .mockResolvedValueOnce({
        items: [cartWithTwoLines.items[1]!],
        itemCount: 1,
        subtotal: 8.95,
      })
      .mockResolvedValueOnce(emptyCart);
    renderPage();

    await screen.findByRole("heading", { name: "Ibuprofen 400mg" });
    await userEvent.click(line("Ibuprofen 400mg").getByRole("button", { name: "Remove" }));

    expect(cartApi.removeCartItem).toHaveBeenCalledWith("1");
    await vi.waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Ibuprofen 400mg" })).not.toBeInTheDocument(),
    );
    expect(summary().getByText("1 item")).toBeVisible();

    await userEvent.click(line("Vitamin D3 1000 IU").getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Your cart is empty")).toBeVisible();
  });

  it("clears a line's error when the next change starts", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    vi.mocked(cartApi.updateCartItem)
      .mockRejectedValueOnce(new ApiError(409, "Only 2 in stock"))
      .mockResolvedValueOnce(cartWithIbuprofen);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Increase quantity" }));
    expect(await screen.findByRole("alert")).toBeVisible();

    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    await vi.waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  describe("Place order", () => {
    const renderWithOrderRoute = () =>
      render(
        <MemoryRouter initialEntries={["/cart"]}>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/cart" element={<CartPage />} />
                <Route path="/orders/:id" element={<p>On the order page</p>} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </MemoryRouter>,
      );

    it("creates the order, goes to its page and leaves the cart empty", async () => {
      vi.mocked(cartApi.getCart).mockResolvedValue(cartWithTwoLines);
      const request = deferred<Order>();
      vi.mocked(ordersApi.createOrder).mockReturnValue(request.promise);
      renderWithOrderRoute();

      await userEvent.click(await screen.findByRole("button", { name: "Place order" }));
      expect(screen.getByRole("button", { name: "Placing order…" })).toBeDisabled();

      request.resolve(order);
      expect(await screen.findByText("On the order page")).toBeVisible();
      expect(ordersApi.createOrder).toHaveBeenCalledTimes(1);
    });

    it("shows the server's reason and keeps the cart when the order is rejected", async () => {
      vi.mocked(cartApi.getCart).mockResolvedValue(cartWithTwoLines);
      vi.mocked(ordersApi.createOrder).mockRejectedValue(
        new ApiError(409, "Only 1 of Ibuprofen 400mg in stock"),
      );
      renderWithOrderRoute();

      await userEvent.click(await screen.findByRole("button", { name: "Place order" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Only 1 of Ibuprofen 400mg in stock",
      );
      expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled();
      expect(screen.getByRole("heading", { name: "Ibuprofen 400mg" })).toBeVisible();
    });
  });
});
