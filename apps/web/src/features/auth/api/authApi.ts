import { ApiError, apiGet, apiPost, apiPostNoContent } from "../../../lib/apiClient";
import type { LoginInput, RegisterInput, User } from "../types";

export function register(input: RegisterInput): Promise<User> {
  return apiPost<User>("/auth/register", input);
}

export function login(input: LoginInput): Promise<User> {
  return apiPost<User>("/auth/login", input);
}

export function logout(): Promise<void> {
  return apiPostNoContent("/auth/logout");
}

/** The signed-in user, or null when there is no valid session. */
export async function fetchCurrentUser(signal?: AbortSignal): Promise<User | null> {
  try {
    return await apiGet<User>("/auth/me", { signal });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}
