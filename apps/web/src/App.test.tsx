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
import { useLocation } from "react-router-dom";
import * as engineModule from "./features/assistant/api/streamEngine";

vi.mock("./features/products/api/searchProducts");
vi.mock("./features/products/api/fetchSuggestions");
vi.mock("./features/products/api/fetchProduct");
vi.mock("./features/auth/api/authApi");
vi.mock("./features/cart/api/cartApi");
// Keeps the real AssistantError, so a 401 is recognised; only the paid engine is faked.
vi.mock("./features/assistant/api/streamEngine", async (importOriginal) => ({
  ...(await importOriginal<typeof engineModule>()),
  streamEngine: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(searchApi.searchProducts).mockResolvedValue({
    items: [ibuprofen],
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  });
  vi.mocked(detailApi.fetchProduct).mockResolvedValue(ibuprofenDetail);
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
  vi.mocked(cartApi.getCart).mockResolvedValue(cartWithIbuprofen);
});

// Shows where the app ended up after a redirect.
function WithLocation() {
  const { pathname, search } = useLocation();
  return (
    <>
      <App />
      <p>At {pathname + search}</p>
    </>
  );
}

describe("App routes", () => {
  it("opens on the assistant at /, without the footer", async () => {
    renderWithRouter(<WithLocation />, "/");
    expect(
      await screen.findByRole("heading", { name: "How are you feeling today?", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("At /")).toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it.each([
    ["/assistant", "At /"],
    ["/assistant?q=sore%20throat", "At /?ask=sore+throat"],
  ])("redirects %s to the assistant at /, keeping the text", async (route, where) => {
    renderWithRouter(<WithLocation />, route);
    expect(await screen.findByText(where)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "How are you feeling today?", level: 1 }),
    ).toBeInTheDocument();
  });

  it("shows the catalogue at /shop", async () => {
    renderWithRouter(<App />, "/shop?q=ibu");
    expect(await screen.findByRole("heading", { name: "Medicines", level: 1 })).toBeInTheDocument();
    expect(searchApi.searchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ q: "ibu" }),
      1,
      expect.any(AbortSignal),
    );
  });

  it.each(["/?q=ibu&category=pain-relief", "/?category=vitamins&page=2", "/?maxPrice=5"])(
    "redirects the old catalogue link %s to /shop with the same query",
    async (route) => {
      renderWithRouter(<WithLocation />, route);
      expect(await screen.findByText(`At /shop${route.slice(1)}`)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Medicines", level: 1 })).toBeInTheDocument();
    },
  );

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
    expect(
      await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 }),
    ).toBeInTheDocument();
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

  it("logs out from the profile to the assistant's intro, not the login page", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(authApi.logout).mockResolvedValue();
    const user = userEvent.setup();
    renderWithRouter(<App />, "/profile");

    await user.click(await screen.findByRole("button", { name: "Account menu" }));
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(
      await screen.findByRole("heading", { name: "How are you feeling today?", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("sends a signed-out visitor from /cart to log in", async () => {
    renderWithRouter(<App />, "/cart");
    expect(await screen.findByRole("heading", { name: "Log in", level: 1 })).toBeInTheDocument();
  });

  it("sends the user to log in when the session ends mid-chat, and resends the message", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(authApi.login).mockResolvedValue(ana);
    vi.mocked(engineModule.streamEngine)
      .mockImplementationOnce(async function* () {
        yield* [];
        throw new engineModule.AssistantError("Your session has ended.", 401);
      })
      .mockImplementationOnce(async function* () {
        yield { kind: "text", text: "Try honey." };
      });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    renderWithRouter(<App />, "/");

    await screen.findByRole("button", { name: "Account menu" });
    await user.type(
      screen.getByRole("textbox", { name: "Describe your symptoms" }),
      "Cough{Enter}",
    );

    expect(await screen.findByRole("heading", { name: "Log in", level: 1 })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), ana.email);
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    const conversation = await screen.findByRole("list", { name: "Conversation" });
    expect(conversation).toHaveTextContent("Cough");
    expect(conversation).toHaveTextContent("Try honey.");
  });

  it("shows the cart at /cart when signed in", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    renderWithRouter(<App />, "/cart");
    expect(await screen.findByRole("heading", { name: "Your cart", level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Ibuprofen 400mg" })).toBeInTheDocument();
  });

  it("shows the style guide at /design in development", async () => {
    renderWithRouter(<App />, "/design");
    expect(
      await screen.findByRole("heading", { name: "Design tokens", level: 1 }),
    ).toBeInTheDocument();
  });

  it("shows a not-found page for an unknown route", () => {
    renderWithRouter(<App />, "/nope");
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });

  describe("the conversation", () => {
    beforeEach(() => {
      vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
      vi.mocked(engineModule.streamEngine).mockImplementation(async function* () {
        yield { kind: "text", text: "Try an antihistamine." };
      });
    });

    async function startChat(user: ReturnType<typeof userEvent.setup>) {
      await screen.findByRole("button", { name: "Account menu" });
      await user.click(screen.getByRole("button", { name: "Hay fever" }));
      expect(await screen.findByRole("list", { name: "Conversation" })).toHaveTextContent(
        "Try an antihistamine.",
      );
    }

    it("survives going to Medicines and back", async () => {
      const user = userEvent.setup();
      renderWithRouter(<App />, "/");
      await startChat(user);

      await user.click(screen.getByRole("link", { name: "Medicines" }));
      expect(
        await screen.findByRole("heading", { name: "Medicines", level: 1 }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("link", { name: "Assistant" }));

      expect(screen.getByRole("list", { name: "Conversation" })).toHaveTextContent(
        "Try an antihistamine.",
      );
    });

    it("survives a reload of the tab", async () => {
      const user = userEvent.setup();
      const { unmount } = renderWithRouter(<App />, "/");
      await startChat(user);
      unmount();

      renderWithRouter(<App />, "/");

      expect(screen.getByRole("list", { name: "Conversation" })).toHaveTextContent(
        "Try an antihistamine.",
      );
    });

    it("starts over from the logo, replaying the intro", async () => {
      const user = userEvent.setup();
      renderWithRouter(<App />, "/");
      await startChat(user);
      await user.click(screen.getByRole("link", { name: "Medicines" }));
      await screen.findByRole("heading", { name: "Medicines", level: 1 });

      await user.click(screen.getByRole("link", { name: "MedDash" }));

      expect(screen.queryByRole("list", { name: "Conversation" })).not.toBeInTheDocument();
      expect(screen.getByRole("region", { name: "How are you feeling today?" })).toHaveAttribute(
        "aria-busy",
        "true",
      );
    });

    it("does not replay the intro on coming back to an empty chat", async () => {
      const user = userEvent.setup();
      renderWithRouter(<App />, "/");
      await screen.findByRole("button", { name: "Account menu" });

      await user.click(screen.getByRole("link", { name: "Medicines" }));
      await screen.findByRole("heading", { name: "Medicines", level: 1 });
      await user.click(screen.getByRole("link", { name: "Assistant" }));

      expect(screen.getByRole("region", { name: "How are you feeling today?" })).toHaveAttribute(
        "aria-busy",
        "false",
      );
    });
  });

  it("opens a product from the list and goes back to the list", async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />, "/shop");

    await user.click(await screen.findByRole("link", { name: "Ibuprofen 400mg" }));
    expect(
      await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /Back to products/ }));
    expect(await screen.findByRole("heading", { name: "Medicines", level: 1 })).toBeInTheDocument();
  });
});

describe("App accessibility", () => {
  it("names the browser tab after the page", async () => {
    renderWithRouter(<App />, "/products/1");
    await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 });
    expect(document.title).toBe("Ibuprofen 400mg | MedDash");
  });

  it("moves focus to the new page after following a link", async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />, "/shop");

    await user.click(await screen.findByRole("link", { name: "Ibuprofen 400mg" }));

    await screen.findByRole("heading", { name: "Ibuprofen 400mg", level: 1 });
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("leaves focus alone on the first page load", async () => {
    renderWithRouter(<App />, "/shop");
    await screen.findByRole("heading", { name: "Medicines", level: 1 });
    expect(screen.getByRole("main")).not.toHaveFocus();
  });

  it("offers a skip link to the main content", () => {
    renderWithRouter(<App />, "/");
    const skip = screen.getByRole("link", { name: "Skip to main content" });
    expect(skip).toHaveAttribute("href", `#${screen.getByRole("main").id}`);
  });
});
