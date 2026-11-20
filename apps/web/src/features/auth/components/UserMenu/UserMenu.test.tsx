import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../lib/apiClient";
import { ana } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import * as authApi from "../../api/authApi";
import { AuthProvider } from "../AuthProvider/AuthProvider";
import { UserMenu } from "./UserMenu";

vi.mock("../../api/authApi");

beforeEach(() => vi.resetAllMocks());

const renderMenu = () =>
  renderWithRouter(
    <AuthProvider>
      <UserMenu />
    </AuthProvider>,
    "/products/1?x=1",
  );

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

  it("shows the user's name and logs out", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(authApi.logout).mockResolvedValue();
    const user = userEvent.setup();
    renderMenu();

    expect(await screen.findByText("Ana Weber")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("link", { name: "Log in" })).toBeInTheDocument();
  });

  it("says so when logging out fails", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(authApi.logout).mockRejectedValue(new ApiError(500, "boom"));
    const user = userEvent.setup();
    renderMenu();

    await user.click(await screen.findByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Couldn't log out. Try again.");
    expect(screen.getByText("Ana Weber")).toBeInTheDocument();
  });
});
