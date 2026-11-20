import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import * as authApi from "./features/auth/api/authApi";
import * as cartApi from "./features/cart/api/cartApi";
import * as detailApi from "./features/products/api/fetchProduct";
import * as searchApi from "./features/products/api/searchProducts";
import { ana, cartWithIbuprofen, ibuprofen, ibuprofenDetail } from "./test/fixtures";
import { renderWithRouter } from "./test/renderWithRouter";
import userEvent from "@testing-library/user-event";

vi.mock("./features/products/api/searchProducts");
vi.mock("./features/products/api/fetchSuggestions");
vi.mock("./features/products/api/fetchProduct");
vi.mock("./features/auth/api/authApi");
vi.mock("./features/cart/api/cartApi");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(searchApi.searchProducts).mockResolvedValue({
    items: [ibuprofen],
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  });
  vi.mocked(detailApi.fetchProduct).mockResolvedValue(ibuprofenDetail);
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
});

describe("App routes", () => {
  it("shows the product search at /", async () => {
    renderWithRouter(<App />, "/");
    expect(await screen.findByRole("heading", { name: "Products", level: 1 })).toBeInTheDocument();
  });

  it("shows the product detail page at /products/:id", async () => {
    renderWithRouter(<App />, "/products/1");
    expect(
      await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 }),
    ).toBeInTheDocument();
  });

  it.each([
    ["/login", "Log in"],
    ["/register", "Create an account"],
  ])("shows the auth page at %s", async (route, heading) => {
    renderWithRouter(<App />, route);
    expect(await screen.findByRole("heading", { name: heading, level: 1 })).toBeInTheDocument();
  });

  it("logs in from the header and shows the user", async () => {
    vi.mocked(authApi.login).mockResolvedValue(ana);
    const user = userEvent.setup();
    renderWithRouter(<App />, "/products/1");

    await user.click(await screen.findByRole("link", { name: "Log in" }));
    await user.type(screen.getByLabelText("Email"), ana.email);
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByRole("button", { name: "Account menu" })).toHaveTextContent("AW");
    // Back on the page the user came from.
    expect(screen.getByRole("heading", { name: "Ibuprofen 400mg", level: 1 })).toBeInTheDocument();
  });

  it("sends a signed-out visitor from /cart to log in", async () => {
    renderWithRouter(<App />, "/cart");
    expect(await screen.findByRole("heading", { name: "Log in", level: 1 })).toBeInTheDocument();
    expect(cartApi.getCart).not.toHaveBeenCalled();
  });

  it("shows the cart at /cart when signed in", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    renderWithRouter(<App />, "/cart");
    expect(await screen.findByRole("heading", { name: "Your cart", level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Ibuprofen 400mg" })).toBeInTheDocument();
  });

  it("sends a signed-out visitor from /profile to log in", async () => {
    renderWithRouter(<App />, "/profile");
    expect(await screen.findByRole("heading", { name: "Log in", level: 1 })).toBeInTheDocument();
  });

  it("shows the profile at /profile when signed in", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    renderWithRouter(<App />, "/profile");
    expect(
      await screen.findByRole("heading", { name: "Your profile", level: 1 }),
    ).toBeInTheDocument();
  });

  it("logs out from the profile to the product search, not the login page", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(authApi.logout).mockResolvedValue();
    const user = userEvent.setup();
    renderWithRouter(<App />, "/profile");

    await user.click(await screen.findByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("heading", { name: "Products", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("shows a not-found page for an unknown route", () => {
    renderWithRouter(<App />, "/nope");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  it("returns to the product search from the logo", async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />, "/products/1");
    expect(
      await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "MedDash" }));
    expect(await screen.findByRole("heading", { name: "Products", level: 1 })).toBeInTheDocument();
  });

  it("opens a product from the list and goes back to the list", async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />, "/");

    await user.click(await screen.findByRole("link", { name: "Ibuprofen 400mg" }));
    expect(
      await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /Back to products/ }));
    expect(await screen.findByRole("heading", { name: "Products", level: 1 })).toBeInTheDocument();
  });
});
