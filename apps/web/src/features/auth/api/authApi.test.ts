import { beforeEach, describe, expect, it, vi } from "vitest";
import * as client from "../../../lib/apiClient";
import { ApiError } from "../../../lib/apiClient";
import { ana } from "../../../test/fixtures";
import { fetchCurrentUser, login, logout, register } from "./authApi";

vi.mock("../../../lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof client>()),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPostNoContent: vi.fn(),
}));

beforeEach(() => vi.resetAllMocks());

describe("authApi", () => {
  it("registers", async () => {
    vi.mocked(client.apiPost).mockResolvedValue(ana);
    const input = { email: ana.email, password: "secret123", name: ana.name };

    expect(await register(input)).toEqual(ana);
    expect(client.apiPost).toHaveBeenCalledWith("/auth/register", input);
  });

  it("logs in", async () => {
    vi.mocked(client.apiPost).mockResolvedValue(ana);
    const input = { email: ana.email, password: "secret123" };

    expect(await login(input)).toEqual(ana);
    expect(client.apiPost).toHaveBeenCalledWith("/auth/login", input);
  });

  it("logs out", async () => {
    await logout();
    expect(client.apiPostNoContent).toHaveBeenCalledWith("/auth/logout");
  });

  describe("fetchCurrentUser", () => {
    it("returns the user and passes the signal", async () => {
      vi.mocked(client.apiGet).mockResolvedValue(ana);
      const { signal } = new AbortController();

      expect(await fetchCurrentUser(signal)).toEqual(ana);
      expect(client.apiGet).toHaveBeenCalledWith("/auth/me", { signal });
    });

    it("returns null when not signed in", async () => {
      vi.mocked(client.apiGet).mockRejectedValue(new ApiError(401, "Not authenticated"));
      expect(await fetchCurrentUser()).toBeNull();
    });

    it("rethrows other errors", async () => {
      vi.mocked(client.apiGet).mockRejectedValue(new ApiError(500, "Internal Server Error"));
      await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 500 });
    });
  });
});
