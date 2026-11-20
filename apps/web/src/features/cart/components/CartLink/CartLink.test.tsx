import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CartLink } from "./CartLink";
import { AuthProvider } from "../../../auth";
import * as authApi from "../../../auth/api/authApi";
import * as cartApi from "../../api/cartApi";
import { CartProvider } from "../CartProvider/CartProvider";
import { ana, cartWithIbuprofen } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";

vi.mock("../../../auth/api/authApi");
vi.mock("../../api/cartApi");

const renderLink = () =>
  renderWithRouter(
    <AuthProvider>
      <CartProvider>
        <CartLink />
      </CartProvider>
    </AuthProvider>,
  );

beforeEach(() => vi.resetAllMocks());

describe("CartLink", () => {
  it("is a plain Cart link while signed out", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    renderLink();

    expect(await screen.findByRole("link", { name: "Cart" })).toHaveAttribute("href", "/cart");
  });

  it("shows the count when signed in", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    renderLink();

    expect(await screen.findByRole("link", { name: "Cart, 2 items" })).toHaveTextContent("2");
  });

  it("uses the singular for one item", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue({ ...cartWithIbuprofen, itemCount: 1 });
    renderLink();

    expect(await screen.findByRole("link", { name: "Cart, 1 item" })).toBeInTheDocument();
  });

  it("caps a large count", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue({ ...cartWithIbuprofen, itemCount: 120 });
    renderLink();

    expect(await screen.findByRole("link", { name: "Cart, 120 items" })).toHaveTextContent("99+");
  });
});
