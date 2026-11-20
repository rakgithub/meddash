import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../lib/apiClient";
import { useLocation } from "react-router-dom";
import { ana } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import * as authApi from "../../api/authApi";
import { useAuth } from "../../hooks/useAuth";
import { AuthProvider } from "./AuthProvider";

vi.mock("../../api/authApi");

beforeEach(() => vi.resetAllMocks());

function Probe() {
  const { state, signIn, signOut } = useAuth();
  const { pathname } = useLocation();
  return (
    <>
      <p>At {pathname}</p>
      <p>{state.status === "signed-in" ? `Signed in as ${state.user.name}` : state.status}</p>
      <button onClick={() => signIn(ana)}>Sign in</button>
      <button onClick={() => signOut().catch(() => {})}>Sign out</button>
    </>
  );
}

const renderProbe = () =>
  renderWithRouter(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
    "/profile",
  );

describe("AuthProvider", () => {
  it("starts loading, then shows the user from /auth/me", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    renderProbe();

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("Signed in as Ana Weber")).toBeInTheDocument();
  });

  it("is signed out when there is no session", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    renderProbe();
    expect(await screen.findByText("signed-out")).toBeInTheDocument();
  });

  it("is signed out when the session check fails", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockRejectedValue(new ApiError(500, "boom"));
    renderProbe();
    expect(await screen.findByText("signed-out")).toBeInTheDocument();
  });

  it("keeps a login that finished before the session check", async () => {
    let resolve: (u: null) => void = () => {};
    vi.mocked(authApi.fetchCurrentUser).mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    renderProbe();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    resolve(null);

    expect(await screen.findByText("Signed in as Ana Weber")).toBeInTheDocument();
  });

  it("signs out through the API and goes home", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(authApi.logout).mockResolvedValue();
    const user = userEvent.setup();
    renderProbe();
    await screen.findByText("Signed in as Ana Weber");

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(await screen.findByText("signed-out")).toBeInTheDocument();
    expect(authApi.logout).toHaveBeenCalled();
    expect(screen.getByText("At /")).toBeInTheDocument();
  });

  it("stays signed in when logout fails", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    vi.mocked(authApi.logout).mockRejectedValue(new ApiError(500, "boom"));
    const user = userEvent.setup();
    renderProbe();
    await screen.findByText("Signed in as Ana Weber");

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByText("Signed in as Ana Weber")).toBeInTheDocument();
    expect(screen.getByText("At /profile")).toBeInTheDocument();
  });

  it("useAuth throws outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/inside <AuthProvider>/);
  });
});
