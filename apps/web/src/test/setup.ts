import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

// jsdom has no matchMedia; default every media query to "no match" (light theme).
// A plain function, not vi.fn, so tests that reset all mocks don't break it.
beforeEach(() => {
  window.matchMedia = (media) => ({
    matches: false,
    media,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
  // jsdom doesn't scroll; without this it logs "Not implemented" for every scrollTo.
  window.scrollTo = () => {};
});

// jsdom has no modal dialogs; open and close them like a browser does, including the "close" event.
HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
  if (!this.open) return;
  this.open = false;
  this.dispatchEvent(new Event("close"));
};

afterEach(() => cleanup());
