import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../features/auth/api/authApi";
import { CartProvider } from "../../features/cart";
import * as cartApi from "../../features/cart/api/cartApi";
import { AuthProvider } from "../../features/auth";
import * as suggestApi from "../../features/products/api/fetchSuggestions";
import { ana, cartWithIbuprofen } from "../../test/fixtures";
import { renderWithRouter } from "../../test/renderWithRouter";
import { AppHeader } from "./AppHeader";

vi.mock("../../features/products/api/fetchSuggestions");
vi.mock("../../features/auth/api/authApi");
vi.mock("../../features/cart/api/cartApi");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(suggestApi.fetchSuggestions).mockResolvedValue([]);
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
});

// Shows where the header sent the user.
function Location() {
  const { pathname, search } = useLocation();
  return <p>At {pathname + search}</p>;
}

const renderHeader = (route: string) =>
  renderWithRouter(
    <AuthProvider>
      <CartProvider>
        <AppHeader />
        <Location />
      </CartProvider>
    </AuthProvider>,
    route,
  );

describe("AppHeader", () => {
  it("shows the app name as a link to the home page", () => {
    renderHeader("/products/1");

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "MedDash" })).toHaveAttribute("href", "/");
  });

  it("has the search box and prescription upload", () => {
    renderHeader("/");

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upload prescription" })).toBeInTheDocument();
  });

  it("links to the cart with the item count when signed in", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
    renderHeader("/");

    expect(await screen.findByRole("link", { name: "Cart, 2 items" })).toHaveAttribute(
      "href",
      "/cart",
    );
  });

  it("has no cart link on the auth pages", () => {
    renderHeader("/login");
    expect(screen.queryByRole("link", { name: /^Cart/ })).not.toBeInTheDocument();
  });

  it("has a dark mode toggle", () => {
    renderHeader("/");
    expect(screen.getByRole("button", { name: "Dark mode" })).toBeInTheDocument();
  });

  it("offers Log in when signed out", async () => {
    renderHeader("/");
    expect(await screen.findByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it.each(["/login", "/register"])("shows only the brand and theme toggle on %s", async (route) => {
    renderHeader(route);

    expect(screen.getByRole("link", { name: "MedDash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark mode" })).toBeInTheDocument();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Upload prescription" })).not.toBeInTheDocument();
    // Let the session check settle, then make sure no account control appeared.
    await vi.waitFor(() => expect(authApi.fetchCurrentUser).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("opens the results for a search made on another page", async () => {
    const user = userEvent.setup();
    renderHeader("/products/1");

    await user.type(screen.getByRole("combobox", { name: "Search products" }), "vitamin{Enter}");

    expect(await screen.findByText("At /?q=vitamin")).toBeInTheDocument();
  });

  it("keeps the filters when it searches", async () => {
    const user = userEvent.setup();
    renderHeader("/?category=vitamins");

    await user.type(screen.getByRole("combobox", { name: "Search products" }), "d3");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText(/At \/\?.*q=d3/)).toHaveTextContent("category=vitamins");
  });

  it("shows the search term from the URL", () => {
    renderHeader("/?q=ibu");

    expect(screen.getByRole("combobox", { name: "Search products" })).toHaveValue("ibu");
  });
});
