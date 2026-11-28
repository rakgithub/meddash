import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ana } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import * as authApi from "../../api/authApi";
import { AuthProvider } from "../AuthProvider/AuthProvider";
import { ProfilePage } from "./ProfilePage";

vi.mock("../../api/authApi");

beforeEach(() => vi.resetAllMocks());

const renderProfile = () =>
  renderWithRouter(
    <AuthProvider>
      <ProfilePage />
    </AuthProvider>,
    "/profile",
  );

describe("ProfilePage", () => {
  it("shows the signed-in user's name and email", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    renderProfile();

    expect(await screen.findByRole("heading", { name: "Your profile", level: 1 })).toBeVisible();
    const details = screen.getByRole("region", { name: "Account details" });
    expect(details).toHaveTextContent("NameAna Weber");
    expect(details).toHaveTextContent("Emailana@example.com");
    expect(screen.getByRole("link", { name: /Back to products/ })).toHaveAttribute("href", "/shop");
  });

  it("renders nothing when signed out", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    const { container } = renderProfile();
    await vi.waitFor(() => expect(authApi.fetchCurrentUser).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
