import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { initials } from "../../utils/initials";
import styles from "./UserMenu.module.css";

export function UserMenu() {
  const { state, signOut } = useAuth();
  const location = useLocation();
  const [error, setError] = useState(false);
  // The page the panel was opened on: moving to another page closes it without an effect.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === location.pathname;
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpenedOn(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenedOn(null);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

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

  const close = () => setOpenedOn(null);

  async function handleLogout() {
    setError(false);
    try {
      await signOut();
    } catch {
      close();
      // Keep focus next to the error note.
      buttonRef.current?.focus();
      setError(true);
    }
  }

  const { name, email } = state.user;

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.avatar}
        aria-label="Account menu"
        aria-expanded={open}
        aria-controls={panelId}
        title={name}
        onClick={() => setOpenedOn(open ? null : location.pathname)}
      >
        {initials(name)}
      </button>
      {open && (
        <div id={panelId} className={styles.panel}>
          <div className={styles.who}>
            <p className={styles.name}>{name}</p>
            <p className={styles.email} title={email}>
              {email}
            </p>
          </div>
          <Link className={styles.item} to="/profile" onClick={close}>
            Profile
          </Link>
          <Link className={styles.item} to="/orders" onClick={close}>
            Orders
          </Link>
          <button type="button" className={styles.item} onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
      <p role="status" className={styles.note}>
        {error ? "Couldn't log out. Try again." : ""}
      </p>
    </div>
  );
}
