import { startTransition, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCurrentUser, logout } from "../../api/authApi";
import { AuthContext, type AuthState } from "../../authContext";
import type { User } from "../../types";

/** Holds who is signed in, loaded once from GET /auth/me; shared by the header and auth pages. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const navigate = useNavigate();

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
    // Go home in the same transition the router uses for navigation, so both land in one render:
    // otherwise a signed-in-only page would see "signed-out" first and redirect to /login.
    startTransition(() => {
      setState({ status: "signed-out" });
      navigate("/");
    });
  };

  const sessionEnded = () => setState({ status: "signed-out" });

  return (
    <AuthContext.Provider value={{ state, signIn, signOut, sessionEnded }}>
      {children}
    </AuthContext.Provider>
  );
}
