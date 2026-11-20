import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import styles from "./UserMenu.module.css";

export function UserMenu() {
  const { state, signOut } = useAuth();
  const location = useLocation();
  const [error, setError] = useState(false);

  // Nothing until the session is known, so "Log in" doesn't flash for a signed-in user.
  if (state.status === "loading") return <div className={styles.root} />;

  if (state.status === "signed-out") {
    return (
      <div className={styles.root}>
        {/* Remember this page so logging in comes back to it. */}
        <Link
          className={styles.login}
          to="/login"
          state={{ from: location.pathname + location.search }}
        >
          Log in
        </Link>
      </div>
    );
  }

  async function handleLogout() {
    setError(false);
    try {
      await signOut();
    } catch {
      setError(true);
    }
  }

  return (
    <div className={styles.root}>
      <span className={styles.name} title={state.user.email}>
        {state.user.name}
      </span>
      <button type="button" className={styles.logout} onClick={handleLogout}>
        Log out
      </button>
      <p role="status" className={styles.note}>
        {error ? "Couldn't log out. Try again." : ""}
      </p>
    </div>
  );
}
