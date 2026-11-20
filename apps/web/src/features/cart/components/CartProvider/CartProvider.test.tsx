import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider } from "./CartProvider";
import { AuthProvider } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import * as ordersApi from "../../../orders/api/ordersApi";
import * as cartApi from "../../api/cartApi";
import { useCart } from "../../hooks/useCart";
import { ana, cartWithIbuprofen, emptyCart, order } from "../../../../test/fixtures";

vi.mock("../../../auth/api/authApi");
vi.mock("../../api/cartApi");
vi.mock("../../../orders/api/ordersApi");

function Probe() {
  const { state, addItem, updateItem, removeItem, placeOrder } = useCart();
  const [failed, setFailed] = useState(false);
  return (
    <>
      {failed && <p>Add failed</p>}
      <p>
        {state.status}
        {state.status === "ready" && ` ${state.cart.itemCount}`}
      </p>
      <button type="button" onClick={() => addItem("1", 2).catch(() => setFailed(true))}>
        Add
      </button>
      <button type="button" onClick={() => updateItem("1", 5)}>
        Update
      </button>
      <button type="button" onClick={() => removeItem("1")}>
        Remove
      </button>
      <button type="button" onClick={() => placeOrder().catch(() => setFailed(true))}>
        Order
      </button>
    </>
  );
}

const renderProvider = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          <Probe />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );

beforeEach(() => vi.resetAllMocks());

describe("CartProvider", () => {
  it("is loading while the session is checked", () => {
    vi.mocked(authApi.fetchCurrentUser).mockReturnValue(new Promise(() => {}));
    renderProvider();
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("does not load a cart when signed out", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    renderProvider();

    expect(await screen.findByText("signed-out")).toBeInTheDocument();
    expect(cartApi.getCart).not.toHaveBeenCalled();
  });

  it("loads the signed-in user's cart", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    renderProvider();

    expect(await screen.findByText("ready 2")).toBeInTheDocument();
  });

  it("reports a cart that could not be loaded", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockRejectedValue(new Error("down"));
    renderProvider();

    expect(await screen.findByText("error")).toBeInTheDocument();
  });

  it("takes the cart the server answers with after adding", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue(emptyCart);
    vi.mocked(cartApi.addToCart).mockResolvedValue(cartWithIbuprofen);
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText("ready 0");

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("ready 2")).toBeInTheDocument();
    expect(cartApi.addToCart).toHaveBeenCalledWith("1", 2);
  });

  it("takes the cart the server answers with after updating and removing", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    vi.mocked(cartApi.updateCartItem).mockResolvedValue({
      ...cartWithIbuprofen,
      itemCount: 5,
    });
    vi.mocked(cartApi.removeCartItem).mockResolvedValue(emptyCart);
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText("ready 2");

    await user.click(screen.getByRole("button", { name: "Update" }));
    expect(await screen.findByText("ready 5")).toBeInTheDocument();
    expect(cartApi.updateCartItem).toHaveBeenCalledWith("1", 5);

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("ready 0")).toBeInTheDocument();
    expect(cartApi.removeCartItem).toHaveBeenCalledWith("1");
  });

  it("empties the cart after placing an order", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    vi.mocked(ordersApi.createOrder).mockResolvedValue(order);
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText("ready 2");

    await user.click(screen.getByRole("button", { name: "Order" }));

    expect(await screen.findByText("ready 0")).toBeInTheDocument();
  });

  it("keeps the cart when the order is rejected", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    vi.mocked(ordersApi.createOrder).mockRejectedValue(new Error("nope"));
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText("ready 2");

    await user.click(screen.getByRole("button", { name: "Order" }));

    expect(await screen.findByText("Add failed")).toBeInTheDocument();
    expect(screen.getByText("ready 2")).toBeInTheDocument();
  });

  it("refuses to order when signed out", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText("signed-out");

    await user.click(screen.getByRole("button", { name: "Order" }));

    expect(await screen.findByText("Add failed")).toBeInTheDocument();
    expect(ordersApi.createOrder).not.toHaveBeenCalled();
  });

  it("refuses to add when signed out", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    const user = userEvent.setup();
    renderProvider();
    await screen.findByText("signed-out");

    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Add failed")).toBeInTheDocument();
    expect(cartApi.addToCart).not.toHaveBeenCalled();
  });
});

describe("useCart", () => {
  it("throws outside the provider", () => {
    // React logs the thrown error; keep the test output clean.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useCart must be used inside <CartProvider>");
    spy.mockRestore();
  });
});
