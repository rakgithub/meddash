import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyTheme, readTheme, saveTheme } from "./theme";

function mockSystemDark(dark: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({ matches: dark });
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("theme", () => {
  it("follows the OS preference when nothing is saved", () => {
    mockSystemDark(true);
    expect(readTheme()).toBe("dark");

    mockSystemDark(false);
    expect(readTheme()).toBe("light");
  });

  it("prefers the saved choice over the OS preference", () => {
    mockSystemDark(true);
    saveTheme("light");
    expect(readTheme()).toBe("light");
  });

  it("ignores an unknown saved value", () => {
    mockSystemDark(false);
    localStorage.setItem("meddash-theme", "purple");
    expect(readTheme()).toBe("light");
  });

  it("falls back to the OS preference when storage is blocked", () => {
    mockSystemDark(true);
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
