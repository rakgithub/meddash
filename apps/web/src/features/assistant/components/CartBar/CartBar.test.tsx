import { act, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ana, cartWithTwoLines, emptyCart } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { AuthProvider } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import { CartProvider } from "../../../cart";
import * as cartApi from "../../../cart/api/cartApi";
import { CartBar } from "./CartBar";

vi.mock("../../../auth/api/authApi");
vi.mock("../../../cart/api/cartApi");

async function renderBar() {
  renderWithRouter(
    <AuthProvider>
      <CartProvider>
        <CartBar />
      </CartProvider>
    </AuthProvider>,
  );
  await act(async () => {});
}

const n = (s: string | null) => s?.replace(/\s/g, " ");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
});

describe("CartBar", () => {
  it("shows the item count, subtotal and Checkout, linking to the cart", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithTwoLines);
    await renderBar();

    const bar = screen.getByRole("link", { name: /^Cart: 3 items/ });
    expect(bar).toHaveAttribute("href", "/cart");
    expect(n(bar.textContent)).toBe("Cart: 3 items · 21,93 € Checkout");
    expect(n(screen.getByRole("status").textContent)).toBe("Cart: 3 items, 21,93 €");
  });

  it("is hidden while the cart is empty, keeping its live region ready", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(emptyCart);
    await renderBar();

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("is hidden when the cart couldn't be loaded", async () => {
    vi.mocked(cartApi.getCart).mockRejectedValue(new Error("offline"));
    await renderBar();

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
