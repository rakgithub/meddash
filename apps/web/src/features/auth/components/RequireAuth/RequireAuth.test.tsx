import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ana } from "../../../../test/fixtures";
import { renderWithRouter } from "../../../../test/renderWithRouter";
import * as authApi from "../../api/authApi";
import { AuthProvider } from "../AuthProvider/AuthProvider";
import { RequireAuth } from "./RequireAuth";

vi.mock("../../api/authApi");

beforeEach(() => vi.resetAllMocks());

// Stands in for the login page and shows where it was asked to return to.
function LoginProbe() {
  const { state } = useLocation();
  const from = typeof state === "object" && state !== null && "from" in state ? state.from : "";
  return <p>Login, back to {String(from)}</p>;
}

const renderGuarded = () =>
  renderWithRouter(
    <AuthProvider>
      <Routes>
        <Route
          path="/secret"
          element={
            <RequireAuth>
              <p>Secret stuff</p>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </AuthProvider>,
    "/secret?tab=1",
  );

describe("RequireAuth", () => {
  it("renders nothing while the session is loading", () => {
    vi.mocked(authApi.fetchCurrentUser).mockReturnValue(new Promise(() => {}));
    const { container } = renderGuarded();
    expect(container).toBeEmptyDOMElement();
  });

  it("sends a signed-out user to log in and remembers the page", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
    renderGuarded();
    expect(await screen.findByText("Login, back to /secret?tab=1")).toBeInTheDocument();
    expect(screen.queryByText("Secret stuff")).not.toBeInTheDocument();
  });

  it("shows the page to a signed-in user", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    renderGuarded();
    expect(await screen.findByText("Secret stuff")).toBeInTheDocument();
  });
});
