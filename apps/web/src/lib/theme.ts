export type Theme = "light" | "dark";

const STORAGE_KEY = "meddash-theme";

/** The user's saved choice, else the OS preference. */
export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // Storage can be blocked (private mode, site settings); the OS preference is a fine fallback.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
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
