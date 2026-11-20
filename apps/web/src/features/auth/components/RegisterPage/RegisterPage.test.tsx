import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../../lib/apiClient";
import { ana } from "../../../../test/fixtures";
import * as authApi from "../../api/authApi";
import { AuthProvider } from "../AuthProvider/AuthProvider";
import { RegisterPage } from "./RegisterPage";

vi.mock("../../api/authApi");

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(null);
});

function Where() {
  return <p>At {useLocation().pathname}</p>;
}

const renderRegister = () =>
  render(
    <MemoryRouter initialEntries={["/register"]}>
      <AuthProvider>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), ana.name);
  await user.type(screen.getByLabelText("Email"), ana.email);
  await user.type(screen.getByLabelText("Password"), "secret123");
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("RegisterPage", () => {
  it("creates the account, signs in and goes home", async () => {
    vi.mocked(authApi.register).mockResolvedValue(ana);
    renderRegister();

    await fillAndSubmit();

    expect(authApi.register).toHaveBeenCalledWith({
      name: ana.name,
      email: ana.email,
      password: "secret123",
    });
    expect(await screen.findByText("At /")).toBeInTheDocument();
  });

  it("states the password rule next to the field", () => {
    renderRegister();
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAccessibleDescription("At least 8 characters");
    expect(password).toHaveAttribute("minLength", "8");
  });

  it.each([
    [409, /already exists/],
    [400, /Check your name, email address and password/],
    [500, /Try again in a moment/],
  ])("explains a %i response", async (status, message) => {
    vi.mocked(authApi.register).mockRejectedValue(new ApiError(status, "x"));
    renderRegister();

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
  });

  it("links to login", () => {
    renderRegister();
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("sends an already signed-in user home", async () => {
    vi.mocked(authApi.fetchCurrentUser).mockResolvedValue(ana);
    renderRegister();
    expect(await screen.findByText("At /")).toBeInTheDocument();
  });
});
