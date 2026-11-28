export type Theme = "light" | "dark";

const STORAGE_KEY = "meddash-theme";

/** The user's saved choice, else dark: the design system's default theme, whatever the OS prefers. */
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Storage can be blocked (private mode, site settings); the default theme is a fine fallback.
  }
  return "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not saving only means the choice resets on the next visit; the toggle still works.
  }
}
