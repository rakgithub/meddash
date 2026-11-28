import { IconButton } from "@meddash/design-system/components";
import { useState } from "react";
import { applyTheme, readTheme, saveTheme } from "../../lib/theme";
import styles from "./ThemeToggle.module.css";

interface ThemeToggleProps {
  /** `icon` for the header; `menuItem` for a row in the account menu. */
  variant?: "icon" | "menuItem";
}

export function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
  const [theme, setTheme] = useState(readTheme);
  const dark = theme === "dark";

  function toggle() {
    const next = dark ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  }

  if (variant === "menuItem") {
    return (
      <button type="button" className={styles.item} aria-pressed={dark} onClick={toggle}>
        Dark mode
        <span className={styles.switch} aria-hidden="true" />
      </button>
    );
  }

  return (
    <IconButton
      label="Dark mode"
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      icon={
        dark ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          </svg>
        )
      }
    />
  );
}
