/**
 * Small per-tab memories in `sessionStorage`. Losing one is harmless (the intro plays again, or a
 * pending message has to be typed again), so blocked storage is ignored rather than reported.
 */
const INTRO_SEEN_KEY = "meddash-intro-seen";
const PENDING_MESSAGE_KEY = "meddash-pending-message";

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // See the note at the top.
  }
}

/** Whether the intro has already played in this tab. */
export const introSeen = () => read(INTRO_SEEN_KEY) === "1";
export const markIntroSeen = () => write(INTRO_SEEN_KEY, "1");
/** The logo plays the intro again. */
export const forgetIntroSeen = () => write(INTRO_SEEN_KEY, null);

/** Where a message goes when nobody is signed in: log in, then back to the chat at `/`. */
export const LOGIN_THEN_HOME = {
  pathname: "/login",
  search: `?${new URLSearchParams({ returnTo: "/" })}`,
};

/** A message typed while signed out (or refused because the session ended), sent once after logging in. */
export const savePendingMessage = (text: string) => write(PENDING_MESSAGE_KEY, text);

/** Reads and removes the pending message, so it can only be sent once. */
export function takePendingMessage(): string | null {
  const text = read(PENDING_MESSAGE_KEY);
  write(PENDING_MESSAGE_KEY, null);
  return text?.trim() ? text : null;
}
