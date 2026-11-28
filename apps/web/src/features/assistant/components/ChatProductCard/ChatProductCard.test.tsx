import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../lib/apiClient";
import {
  ana,
  cartWithIbuprofen,
  coughSyrupDetail,
  emptyCart,
  ibuprofenDetail,
} from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import { AuthProvider } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import { CartLink, CartProvider } from "../../../cart";
import * as cartApi from "../../../cart/api/cartApi";
import { ChatProductCard } from "./ChatProductCard";

vi.mock("../../../auth/api/authApi");
vi.mock("../../../cart/api/cartApi");

/** The row under the signed-in user's cart, with the header's cart link to see the count change. */
async function renderRow(ui: ReactElement) {
  const result = renderWithRouter(
    <AuthProvider>
      <CartProvider>
        <CartLink />
        {ui}
      </CartProvider>
    </AuthProvider>,
  );
  // Let the session check and the cart load settle.
  await act(async () => {});
  return result;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
  vi.mocked(cartApi.getCart).mockResolvedValue(emptyCart);
});

const n = (s: string | null) => s?.replace(/\s/g, " ");

describe("ChatProductCard", () => {
  it("shows the product's name as a link, why it was picked and Add with its price", async () => {
    await renderRow(
      <ChatProductCard
        recommendation={{ product: ibuprofenDetail, reason: "Brings fever down", fit: "best" }}
      />,
    );

    const row = screen.getByRole("article", { name: "Ibuprofen 400mg" });
    expect(row).toHaveTextContent("Brings fever down");
    expect(n(row.textContent)).toContain("6,49 €");
    expect(
      screen.getByRole("button", { name: /^Add Ibuprofen 400mg to cart\s+6,49\s€$/ }),
    ).toBeEnabled();
    expect(row).not.toHaveTextContent("In stock");
    expect(screen.getByRole("link", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "href",
      "/products/1",
    );
  });

  it("shows a caution when a warning concerns who it is for", async () => {
    await renderRow(
      <ChatProductCard
        recommendation={{
          product: ibuprofenDetail,
          reason: "",
          fit: "good",
          caution: "Not suitable for children under 6 years.",
        }}
      />,
    );

    expect(screen.getByRole("article")).toHaveTextContent(
      "Check first: Not suitable for children under 6 years.",
    );
  });

  it("says when stock is low or gone, and can't add what is gone", async () => {
    const { rerender } = await renderRow(
      <ChatProductCard
        recommendation={{
          product: { ...ibuprofenDetail, stockQuantity: 3 },
          reason: "",
          fit: "good",
        }}
      />,
    );
    expect(screen.getByRole("article")).toHaveTextContent("Only 3 left");

    rerender(
      <AuthProvider>
        <CartProvider>
          <ChatProductCard
            recommendation={{
              product: { ...ibuprofenDetail, stockQuantity: 0 },
              reason: "",
              fit: "good",
            }}
          />
        </CartProvider>
      </AuthProvider>,
    );
    await act(async () => {});
    expect(screen.getByRole("article")).toHaveTextContent("Out of stock");
    expect(screen.queryByRole("button", { name: /^Add/ })).not.toBeInTheDocument();
  });

  it("shows that a prescription-only product needs a prescription, without a price", async () => {
    await renderRow(
      <ChatProductCard recommendation={{ product: coughSyrupDetail, reason: "", fit: "locked" }} />,
    );

    const row = screen.getByRole("article", { name: "Cough Syrup" });
    expect(row).toHaveTextContent("Needs a prescription");
    expect(n(row.textContent)).not.toContain("€");
    expect(screen.queryByRole("button", { name: /^Add/ })).not.toBeInTheDocument();
  });

  it("adds one to the cart, then says it is in the cart and updates the header count", async () => {
    vi.mocked(cartApi.addToCart).mockResolvedValue(cartWithIbuprofen);
    const user = userEvent.setup();
    await renderRow(
      <ChatProductCard recommendation={{ product: ibuprofenDetail, reason: "", fit: "best" }} />,
    );
    expect(screen.getByRole("link", { name: "Cart, 0 items" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Add Ibuprofen 400mg/ }));

    expect(cartApi.addToCart).toHaveBeenCalledWith("1", 1);
    expect(await screen.findByRole("link", { name: "In cart" })).toHaveAttribute("href", "/cart");
    expect(screen.queryByRole("button", { name: /^Add/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cart, 2 items" })).toBeInTheDocument();
  });

  it("says In cart for a product already in the cart", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    await renderRow(
      <ChatProductCard recommendation={{ product: ibuprofenDetail, reason: "", fit: "best" }} />,
    );

    expect(screen.getByRole("link", { name: "In cart" })).toBeInTheDocument();
  });

  it("shows the server's reason when it can't add, and lets the user try again", async () => {
    vi.mocked(cartApi.addToCart).mockRejectedValue(new ApiError(409, "Only 3 left in stock"));
    const user = userEvent.setup();
    await renderRow(
      <ChatProductCard recommendation={{ product: ibuprofenDetail, reason: "", fit: "best" }} />,
    );

    await user.click(screen.getByRole("button", { name: /^Add Ibuprofen 400mg/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Only 3 left in stock");
    expect(screen.getByRole("button", { name: /^Add Ibuprofen 400mg/ })).toBeEnabled();
  });
});
