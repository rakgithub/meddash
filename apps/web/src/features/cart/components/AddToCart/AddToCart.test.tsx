import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddToCart } from "./AddToCart";
import { AuthProvider } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import * as cartApi from "../../api/cartApi";
import { CartLink } from "../CartLink/CartLink";
import { CartProvider } from "../CartProvider/CartProvider";
import { ApiError } from "../../../../lib/apiClient";
import {
  ana,
  cartWithIbuprofen,
  coughSyrupDetail,
  emptyCart,
  ibuprofenDetail,
  paracetamolDetail,
} from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";

vi.mock("../../../auth/api/authApi");
vi.mock("../../api/cartApi");

function LoginSpy() {
  const { state } = useLocation();
  const from = typeof state === "object" && state !== null && "from" in state ? state.from : null;
  return <p>Login page, back to {String(from)}</p>;
}

const renderAddToCart = (product = ibuprofenDetail) =>
  renderWithRouter(
    <AuthProvider>
      <CartProvider>
        <CartLink />
        <Routes>
          <Route path="/products/:id" element={<AddToCart product={product} />} />
          <Route path="/login" element={<LoginSpy />} />
        </Routes>
      </CartProvider>
    </AuthProvider>,
    `/products/${product.id}?from=search`,
  );

const addButton = () => screen.getByRole("button", { name: "Add to cart" });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
  vi.mocked(cartApi.getCart).mockResolvedValue(emptyCart);
});

describe("AddToCart when signed in", () => {
  it("adds the chosen quantity, confirms it and updates the header count", async () => {
    vi.mocked(cartApi.addToCart).mockResolvedValue(cartWithIbuprofen);
    const user = userEvent.setup();
    renderAddToCart();
    await screen.findByRole("link", { name: "Cart, 0 items" });

    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(addButton());

    expect(cartApi.addToCart).toHaveBeenCalledWith("1", 2);
    expect(await screen.findByRole("status")).toHaveTextContent("Added 2 to cart.");
    expect(screen.getByRole("link", { name: "View cart" })).toHaveAttribute("href", "/cart");
    expect(screen.getByRole("link", { name: "Cart, 2 items" })).toBeInTheDocument();
  });

  it("shows Adding… and disables the button while sending", async () => {
    vi.mocked(cartApi.addToCart).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderAddToCart();
    await vi.waitFor(() => expect(addButton()).toBeEnabled());

    await user.click(addButton());

    expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
  });

  it("shows the server's error and keeps the quantity", async () => {
    vi.mocked(cartApi.addToCart).mockRejectedValue(new ApiError(409, "Only 3 left in stock"));
    const user = userEvent.setup();
    renderAddToCart(paracetamolDetail);
    await vi.waitFor(() => expect(addButton()).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(addButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Only 3 left in stock");
    expect(screen.getByRole("spinbutton", { name: "Quantity" })).toHaveValue(2);
    expect(addButton()).toBeEnabled();
  });

  it("explains a failure that is not from the server", async () => {
    vi.mocked(cartApi.addToCart).mockRejectedValue(new TypeError("Failed to fetch"));
    const user = userEvent.setup();
    renderAddToCart();
    await vi.waitFor(() => expect(addButton()).toBeEnabled());

    await user.click(addButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Check your connection");
  });

  it("sends the user to log in when the session has ended", async () => {
    vi.mocked(cartApi.addToCart).mockRejectedValue(new ApiError(401, "Not authenticated"));
    const user = userEvent.setup();
    renderAddToCart();
    await vi.waitFor(() => expect(addButton()).toBeEnabled());

    await user.click(addButton());

    expect(await screen.findByText("Login page, back to /products/1?from=search")).toBeVisible();
  });

  it("limits the quantity to the stock", async () => {
    const user = userEvent.setup();
    renderAddToCart(paracetamolDetail);

    const more = screen.getByRole("button", { name: "Increase quantity" });
    await user.click(more);
    await user.click(more);

    expect(screen.getByRole("spinbutton", { name: "Quantity" })).toHaveValue(3);
    expect(more).toBeDisabled();
  });
});

describe("AddToCart when signed out", () => {
  it("goes to log in and remembers the product page", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    const user = userEvent.setup();
    renderAddToCart();
    await vi.waitFor(() => expect(addButton()).toBeEnabled());

    await user.click(addButton());

    expect(await screen.findByText("Login page, back to /products/1?from=search")).toBeVisible();
    expect(cartApi.addToCart).not.toHaveBeenCalled();
  });
});

describe("AddToCart when the product can't be added", () => {
  it.each([
    ["a prescription-only product", coughSyrupDetail, "Needs a prescription"],
    [
      "an out-of-stock product",
      { ...ibuprofenDetail, stockQuantity: 0 },
      "Can't be ordered right now",
    ],
  ])("disables the button for %s and says why", async (_label, product, reason) => {
    renderAddToCart(product);

    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(addButton()).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: "Quantity" })).toBeDisabled();
  });
});

describe("AddToCart bottom bar", () => {
  type Where = "below" | "in view" | "above";
  let report: (where: Where) => void = () => {};

  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(
          callback: (
            entries: { isIntersecting: boolean; boundingClientRect: { top: number } }[],
          ) => void,
        ) {
          report = (where) =>
            callback([
              {
                isIntersecting: where === "in view",
                boundingClientRect: { top: where === "above" ? -200 : 900 },
              },
            ]);
        }
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it("repeats price and Add to cart once the buy box scrolls away", async () => {
    vi.mocked(cartApi.addToCart).mockResolvedValue(cartWithIbuprofen);
    const user = userEvent.setup();
    renderAddToCart();
    expect(screen.getAllByRole("button", { name: "Add to cart" })).toHaveLength(1);

    // Not reached yet: the controls are still ahead, so no bar.
    act(() => report("below"));
    expect(screen.getAllByRole("button", { name: "Add to cart" })).toHaveLength(1);

    act(() => report("above"));

    expect(screen.getByText(/6,49\s€/)).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Add to cart" });
    expect(buttons).toHaveLength(2);
    await vi.waitFor(() => expect(buttons[1]).toBeEnabled());
    await user.click(buttons[1]!);
    expect(cartApi.addToCart).toHaveBeenCalledWith("1", 1);

    act(() => report("in view"));
    expect(screen.queryByText(/6,49\s€/)).not.toBeInTheDocument();
  });
});
