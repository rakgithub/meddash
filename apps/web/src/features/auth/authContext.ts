import { createContext } from "react";
import type { User } from "./types";

export type AuthState =
  { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; user: User };

export interface AuthContextValue {
  state: AuthState;
  /** Call after a successful login or registration. */
  signIn: (user: User) => void;
  /** Ends the session on the server and goes home; rejects if that fails, so the user stays signed in. */
  signOut: () => Promise<void>;
  /** Call when the API answers 401: the session is gone, so signed-in pages send the user to log in. */
  sessionEnded: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
