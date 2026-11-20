import { createContext } from "react";
import type { User } from "./types";

export type AuthState =
  { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; user: User };

export interface AuthContextValue {
  state: AuthState;
  /** Call after a successful login or registration. */
  signIn: (user: User) => void;
  /** Ends the session on the server; rejects if that fails, so the user stays signed in. */
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
