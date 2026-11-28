import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as authApi from "../../features/auth/api/authApi";
import { CartProvider } from "../../features/cart";
import * as cartApi from "../../features/cart/api/cartApi";
import { AuthProvider } from "../../features/auth";
import { ana, cartWithIbuprofen } from "../../test/fixtures";
import { renderWithRouter } from "../../test/renderWithRouter";
import { AppHeader } from "./AppHeader";

vi.mock("../../features/auth/api/authApi");
vi.mock("../../features/cart/api/cartApi");

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
  vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
});

const renderHeader = (route: string) =>
  renderWithRouter(
    <AuthProvider>
      <CartProvider>
        <AppHeader />
      </CartProvider>
    </AuthProvider>,
    route,
  );

const menu = () => screen.getByRole("navigation", { name: "Main" });

// The names of the menu's entries, in order.
const entryNames = () =>
  within(menu())
    .getAllByRole("listitem")
    .map((item) => within(item).queryByRole("link") ?? within(item).queryByRole("button"))
    .map((entry) => entry?.getAttribute("aria-label") ?? entry?.textContent);

const signIn = () => vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);

describe("AppHeader", () => {
  it("shows the app name as a link to the home page", () => {
    renderHeader("/products/1");

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "MedDash" })).toHaveAttribute("href", "/");
  });

  it("has no search box: search lives on the Medicines page", () => {
    renderHeader("/products/1");
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });

  it("signed out: Assistant, Medicines, the theme, Log in and Cart", async () => {
    renderHeader("/products/1");

    await screen.findByRole("link", { name: "Log in" });
    expect(entryNames()).toEqual(["Assistant", "Medicines", "Dark mode", "Log in", "Cart"]);
    expect(within(menu()).getByRole("link", { name: "Assistant" })).toHaveAttribute(
      "href",
      "/assistant",
    );
    expect(within(menu()).getByRole("link", { name: "Medicines" })).toHaveAttribute(
      "href",
      "/shop",
    );
    expect(within(menu()).queryByRole("link", { name: "Orders" })).not.toBeInTheDocument();
  });

  it("signed in: Orders and the account menu, with the theme inside it", async () => {
    signIn();
    const user = userEvent.setup();
    renderHeader("/products/1");

    const account = await screen.findByRole("button", { name: "Account menu" });
    await screen.findByRole("link", { name: "Cart, 2 items" });
    expect(entryNames()).toEqual([
      "Assistant",
      "Medicines",
      "Orders",
      "Account menu",
      "Cart, 2 items",
    ]);
    expect(within(menu()).getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/orders");
    expect(screen.queryByRole("button", { name: "Dark mode" })).not.toBeInTheDocument();

    await user.click(account);
    expect(screen.getByRole("button", { name: "Dark mode" })).toBeVisible();
  });

  it("shows only Medicines and Cart while the session is loading", () => {
    vi.mocked(authApi.fetchCurrentUser).mockReturnValue(new Promise(() => {}));
    renderHeader("/products/1");

    expect(
      within(menu())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Assistant", "Medicines", "Cart"]);
    expect(screen.queryByRole("button", { name: "Dark mode" })).not.toBeInTheDocument();
  });

  it("hides Assistant on /", async () => {
    renderHeader("/");

    await screen.findByRole("link", { name: "Log in" });
    expect(within(menu()).queryByRole("link", { name: "Assistant" })).not.toBeInTheDocument();
  });

  it.each([
    ["/shop?q=ibu", "Medicines"],
    ["/assistant", "Assistant"],
    ["/orders", "Orders"],
    ["/cart", "Cart, 2 items"],
  ])("marks the current page on %s", async (route, name) => {
    signIn();
    renderHeader(route);

    await screen.findByRole("button", { name: "Account menu" });
    const current = await within(menu()).findByRole("link", { name });
    expect(current).toHaveAttribute("aria-current", "page");
    const others = within(menu())
      .getAllByRole("link")
      .filter((link) => link !== current);
    others.forEach((link) => expect(link).not.toHaveAttribute("aria-current"));
  });

  it("links to the cart with the item count when signed in", async () => {
    signIn();
    renderHeader("/shop");

    expect(await screen.findByRole("link", { name: "Cart, 2 items" })).toHaveAttribute(
      "href",
      "/cart",
    );
  });

  it("switches the theme from the icon when signed out", async () => {
    const user = userEvent.setup();
    renderHeader("/shop");

    const toggle = await within(menu()).findByRole("button", { name: "Dark mode" });
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it.each(["/login", "/register"])("shows only the brand and theme toggle on %s", async (route) => {
    renderHeader(route);

    expect(screen.getByRole("link", { name: "MedDash" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark mode" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    // Let the session check settle, then make sure no account control appeared.
    await vi.waitFor(() => expect(authApi.fetchCurrentUser).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Log in" })).not.toBeInTheDocument();
  });
});
