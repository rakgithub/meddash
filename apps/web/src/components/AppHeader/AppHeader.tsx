import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useConsultationContext } from "../../features/assistant";
import { useAuth, UserMenu } from "../../features/auth";
import { CartLink } from "../../features/cart";
import { SHOP_PATH } from "../../features/products";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./AppHeader.module.css";

export function AppHeader() {
  const { pathname } = useLocation();
  const { state } = useAuth();
  const { restart } = useConsultationContext();
  // The auth pages keep the header quiet: no menu next to the form, only the theme.
  const slim = pathname === "/login" || pathname === "/register";

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {/* Home is the assistant: the logo starts a new conversation, with the intro. */}
        <Link className={styles.brand} to="/" onClick={restart}>
          {/* A capsule on the diagonal: the filled half is the "dash", the outline is the medicine. */}
          <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true">
            <g transform="rotate(-45 16 16)">
              <path className={styles.capsuleRight} d="M16 10.5H23.5A5.5 5.5 0 0 1 23.5 21.5H16Z" />
              <path className={styles.capsuleLeft} d="M16 10.5H8.5A5.5 5.5 0 0 0 8.5 21.5H16Z" />
              <rect
                className={styles.capsuleOutline}
                x="3"
                y="10.5"
                width="26"
                height="11"
                rx="5.5"
              />
            </g>
          </svg>
          <span className={styles.wordmark}>MedDash</span>
        </Link>
        {slim ? (
          <ThemeToggle />
        ) : (
          <nav className={styles.nav} aria-label="Main">
            <ul className={styles.list}>
              {/* `/` is the assistant, so there the link would point at the page itself. */}
              {pathname !== "/" && (
                <li>
                  <MenuLink to="/" label="Assistant" icon={<AssistantIcon />} />
                </li>
              )}
              <li>
                <MenuLink to={SHOP_PATH} label="Medicines" icon={<MedicinesIcon />} />
              </li>
              {state.status === "signed-in" && (
                <li>
                  <MenuLink to="/orders" label="Orders" icon={<OrdersIcon />} />
                </li>
              )}
              {/* Signed in, the theme lives in the account menu. */}
              {state.status === "signed-out" && (
                <li>
                  <ThemeToggle />
                </li>
              )}
              <li>
                <UserMenu themeToggle={<ThemeToggle variant="menuItem" />} />
              </li>
              <li>
                <CartLink />
              </li>
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

/** A menu entry: icon and label, the label hidden (but still its name) on a phone. */
function MenuLink({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    // NavLink sets aria-current="page" on the entry for the current page.
    <NavLink className={styles.item} to={to}>
      {icon}
      <span className={styles.label}>{label}</span>
    </NavLink>
  );
}

const AssistantIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 4.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" />
    <path d="M8 9.5h8M8 12.5h5" />
  </svg>
);

const MedicinesIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <g transform="rotate(-45 12 12)">
      <rect x="3" y="8.25" width="18" height="7.5" rx="3.75" />
      <path d="M12 8.25v7.5" />
    </g>
  </svg>
);

const OrdersIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5Z" />
    <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
  </svg>
);
