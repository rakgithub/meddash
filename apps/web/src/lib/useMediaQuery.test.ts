import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMediaQuery } from "./useMediaQuery";

/** A media query list whose match can be flipped, like resizing the window. */
function fakeMatchMedia(initial: boolean) {
  let matches = initial;
  const events = new EventTarget();
  window.matchMedia = (media) => ({
    get matches() {
      return matches;
    },
    media,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  });
  return {
    set(next: boolean) {
      matches = next;
      events.dispatchEvent(new Event("change"));
    },
  };
}

describe("useMediaQuery", () => {
  it("reports whether the query matches, and follows changes", () => {
    const media = fakeMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width: 860px)"));
    expect(result.current).toBe(false);

    act(() => media.set(true));

    expect(result.current).toBe(true);
  });
});
