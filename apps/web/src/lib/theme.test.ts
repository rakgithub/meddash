import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, readTheme, saveTheme } from "./theme";

function mockSystemDark(dark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: dark });
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("theme", () => {
  it("defaults to dark when nothing is saved, whatever the OS prefers", () => {
    mockSystemDark(false);
    expect(readTheme()).toBe("dark");

    mockSystemDark(true);
    expect(readTheme()).toBe("dark");
  });

  it("uses the saved choice", () => {
    saveTheme("light");
    expect(readTheme()).toBe("light");
  });

  it("ignores an unknown saved value", () => {
    localStorage.setItem("meddash-theme", "purple");
    expect(readTheme()).toBe("dark");
  });

  it("falls back to dark when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readTheme()).toBe("dark");
  });

  it("does not throw when saving is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveTheme("dark")).not.toThrow();
  });

  it("sets the theme on the document", () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});
