import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartPage } from "./CartPage";
import { AuthProvider } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import * as cartApi from "../../api/cartApi";
import { CartProvider } from "../CartProvider/CartProvider";
import { ana, cartWithIbuprofen, emptyCart } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";

vi.mock("../../../auth/api/authApi");
vi.mock("../../api/cartApi");

const renderPage = () =>
  renderWithRouter(
    <AuthProvider>
      <CartProvider>
        <CartPage />
      </CartProvider>
    </AuthProvider>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
});

describe("CartPage", () => {
  it("shows a loading message", () => {
    vi.mocked(cartApi.getCart).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText("Loading cart...")).toBeInTheDocument();
  });

  it("shows an error message", async () => {
    vi.mocked(cartApi.getCart).mockRejectedValue(new Error("down"));
    renderPage();
    expect(await screen.findByText(/Couldn't load your cart/)).toBeInTheDocument();
  });

  it("shows the empty state with a way back", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(emptyCart);
    renderPage();
    expect(await screen.findByText("Your cart is empty.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse products" })).toHaveAttribute("href", "/");
  });

  it("lists the lines and the subtotal", async () => {
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    renderPage();

    const item = await screen.findByRole("listitem");
    expect(item).toHaveTextContent("Ibuprofen 400mg");
    expect(item).toHaveTextContent(/2 × 6,49\s€/);
    expect(item).toHaveTextContent(/12,98\s€/);
    expect(screen.getByRole("link", { name: "Ibuprofen 400mg" })).toHaveAttribute(
      "href",
      "/products/1",
    );
    expect(screen.getByText("Subtotal (2 items)")).toBeInTheDocument();
  });
});
