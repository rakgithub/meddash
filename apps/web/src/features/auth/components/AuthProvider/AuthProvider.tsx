import { useEffect, useState, type ReactNode } from "react";
import { fetchCurrentUser, logout } from "../../api/authApi";
import { AuthContext, type AuthState } from "../../authContext";
import type { User } from "../../types";

/** Holds who is signed in, loaded once from GET /auth/me; shared by the header and auth pages. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    // Only settle the initial load: a login that finished first must not be overwritten.
    const settle = (next: AuthState) =>
      setState((prev) => (prev.status === "loading" ? next : prev));
    fetchCurrentUser(controller.signal)
      .then((user) => settle(user ? { status: "signed-in", user } : { status: "signed-out" }))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // If the session can't be checked, offer "Log in"; logging in reports any real outage.
        settle({ status: "signed-out" });
      });
    return () => controller.abort();
  }, []);

  const signIn = (user: User) => setState({ status: "signed-in", user });
  const signOut = async () => {
    await logout();
    setState({ status: "signed-out" });
  };

  return <AuthContext.Provider value={{ state, signIn, signOut }}>{children}</AuthContext.Provider>;
}
