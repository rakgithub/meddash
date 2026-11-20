import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../lib/apiClient";
import { ana } from "../../../../test/fixtures";
import * as authApi from "../../api/authApi";
import { AuthProvider } from "../AuthProvider/AuthProvider";
import { LoginPage } from "./LoginPage";

vi.mock("../../api/authApi");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
});

function Where() {
  return <p>At {useLocation().pathname}</p>;
}

const renderLogin = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

async function fillAndSubmit(password = "secret123") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), ana.email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

describe("LoginPage", () => {
  it("logs in and goes to the home page", async () => {
    vi.mocked(authApi.login).mockResolvedValue(ana);
    renderLogin();

    await fillAndSubmit();

    expect(authApi.login).toHaveBeenCalledWith({ email: ana.email, password: "secret123" });
    expect(await screen.findByText("At /")).toBeInTheDocument();
  });

  it("returns to the page that sent the user to log in", async () => {
    vi.mocked(authApi.login).mockResolvedValue(ana);
    renderLogin({ from: "/products/1" });

    await fillAndSubmit();

    expect(await screen.findByText("At /products/1")).toBeInTheDocument();
  });

  it("ignores a return path to another site", async () => {
    vi.mocked(authApi.login).mockResolvedValue(ana);
    renderLogin({ from: "//evil.example" });

    await fillAndSubmit();

    expect(await screen.findByText("At /")).toBeInTheDocument();
  });

  it("explains wrong credentials and stays on the page", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(401, "Invalid email or password"));
    renderLogin();

    await fillAndSubmit("wrong");

    expect(await screen.findByRole("alert")).toHaveTextContent(/don't match an account/);
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  it("shows a retry message when the server fails", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(500, "boom"));
    renderLogin();

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(/Try again in a moment/);
  });

  it("links to registration", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  it("sends an already signed-in user home", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    renderLogin();
    expect(await screen.findByText("At /")).toBeInTheDocument();
  });
});
