import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

/** Renders its children only for a signed-in user; sends anyone else to log in and back. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const { pathname, search } = useLocation();

  // Wait for the session check, so a signed-in user isn't bounced to /login on a reload.
  if (state.status === "loading") return null;
  if (state.status === "signed-out") {
    return <Navigate to="/login" replace state={{ from: pathname + search }} />;
  }
  return children;
}
