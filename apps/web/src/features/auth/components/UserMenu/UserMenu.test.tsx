import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../lib/apiClient";
import { ana } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import * as authApi from "../../api/authApi";
import { AuthProvider } from "../AuthProvider/AuthProvider";
import { UserMenu } from "./UserMenu";

vi.mock("../../api/authApi");

beforeEach(() => vi.resetAllMocks());

function Location() {
  const { pathname } = useLocation();
  return <p>At {pathname}</p>;
}

const renderMenu = () =>
  renderWithRouter(
    <AuthProvider>
      <UserMenu />
      <p>Elsewhere</p>
      <Location />
    </AuthProvider>,
    "/products/1?x=1",
  );

async function renderSignedIn() {
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
  const user = userEvent.setup();
  renderMenu();
  const button = await screen.findByRole("button", { name: "Account menu" });
  return { user, button };
}

describe("UserMenu", () => {
  it("shows nothing while the session is loading", () => {
    vi.mocked(authApi.fetchCurrentUser).mockReturnValue(new Promise(() => {}));
    renderMenu();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers Log in when signed out", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    renderMenu();
    expect(await screen.findByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("shows the user's initials with the menu closed", async () => {
    const { button } = await renderSignedIn();
    expect(button).toHaveTextContent("AW");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("ana@example.com")).not.toBeInTheDocument();
  });

  it("opens to show who is signed in, Profile and Log out", async () => {
    const { user, button } = await renderSignedIn();
    await user.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ana Weber")).toBeVisible();
    expect(screen.getByText("ana@example.com")).toBeVisible();
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/orders");
    expect(screen.getByRole("button", { name: "Log out" })).toBeVisible();

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and puts focus back on the button", async () => {
    const { user, button } = await renderSignedIn();
    await user.click(button);
    await user.tab();
    expect(screen.getByRole("link", { name: "Profile" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes when clicking outside", async () => {
    const { user, button } = await renderSignedIn();
    await user.click(button);
    await user.click(screen.getByText("Elsewhere"));
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("goes to the profile and closes", async () => {
    const { user, button } = await renderSignedIn();
    await user.click(button);
    await user.click(screen.getByRole("link", { name: "Profile" }));

    expect(await screen.findByText("At /profile")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("logs out and goes home", async () => {
    vi.mocked(authApi.logout).mockResolvedValue();
    const { user, button } = await renderSignedIn();
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByText("At /")).toBeInTheDocument();
  });

  it("says so when logging out fails", async () => {
    vi.mocked(authApi.logout).mockRejectedValue(new ApiError(500, "boom"));
    const { user, button } = await renderSignedIn();
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Couldn't log out. Try again.");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
    expect(screen.getByText("At /products/1")).toBeInTheDocument();
  });
});
