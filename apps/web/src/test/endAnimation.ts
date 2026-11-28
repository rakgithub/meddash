/**
 * Ends a CSS animation on `element`, for code that waits for `onAnimationEnd`. jsdom runs no CSS
 * animations, so the event is dispatched by hand (userEvent has no equivalent). jsdom also lacks
 * `AnimationEvent`, so React listens for the prefixed event name there.
 */
export function endAnimation(element: Element | null) {
  element?.dispatchEvent(new Event("webkitAnimationEnd", { bubbles: true }));
}
