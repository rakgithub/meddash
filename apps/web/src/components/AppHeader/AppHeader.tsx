import { Link, useLocation } from "react-router-dom";
import { UserMenu } from "../../features/auth";
import { CartLink } from "../../features/cart";
import { SearchBar, useSearchQuery } from "../../features/products";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./AppHeader.module.css";

export function AppHeader() {
  // Searching from any page opens the results on `/`.
  const { filters, search } = useSearchQuery();
  const { pathname } = useLocation();
  // The auth pages keep the header quiet: no search or account controls next to the form.
  const slim = pathname === "/login" || pathname === "/register";

  return (
    <header className={styles.header}>
      <div className={slim ? `${styles.inner} ${styles.slim}` : styles.inner}>
        <Link className={styles.brand} to="/">
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
          MedDash
        </Link>
        {!slim && (
          <div className={styles.search}>
            <SearchBar
              query={filters.q}
              onSearch={(q) => search({ ...filters, q })}
              onSelectCategory={(category) => search({ ...filters, q: "", category })}
            />
          </div>
        )}
        <ThemeToggle />
        {!slim && <CartLink />}
        {!slim && <UserMenu />}
      </div>
    </header>
  );
}
