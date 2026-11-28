import tokensCss from "@meddash/design-system/tokens.css?raw";
import themesCss from "@meddash/design-system/themes.css?raw";
import { describe, expect, it } from "vitest";
import { parseThemes, parseTokenGroups, resolveValue } from "./parseTokens";

const sample = `/* Header about the file */
:root {
  /* Surfaces */
  --ink-950: #0c1517;
  /* Edge stays visible. */
  --ink-400: #5b7a74;

  /* Motion: one easing per job */
  --ease-out: cubic-bezier(0.2, 0.7, 0.2, 1); /* things arriving */
  --duration-fast: 150ms;
}`;

describe("parseTokenGroups", () => {
  it("groups tokens under their heading comments, with notes", () => {
    expect(parseTokenGroups(sample)).toEqual([
      {
        title: "Surfaces",
        tokens: [
          { name: "--ink-950", value: "#0c1517" },
          { name: "--ink-400", value: "#5b7a74", note: "Edge stays visible." },
        ],
      },
      {
        title: "Motion",
        tokens: [
          { name: "--ease-out", value: "cubic-bezier(0.2, 0.7, 0.2, 1)", note: "things arriving" },
          { name: "--duration-fast", value: "150ms" },
        ],
      },
    ]);
  });

  it("returns no groups for CSS without a :root block", () => {
    expect(parseTokenGroups(".x { color: red; }")).toEqual([]);
  });

  it("reads every primitive in the real tokens.css", () => {
    const groups = parseTokenGroups(tokensCss);
    const names = groups.flatMap((group) => group.tokens.map((token) => token.name));
    const declared = [...tokensCss.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);

    expect(names).toEqual(declared);
    expect(groups.map((group) => group.title)).toContain("Space, on a 4px grid");
  });
});

describe("parseThemes", () => {
  it("reads both themes, folding values that span lines", () => {
    const { dark, light } = parseThemes(themesCss);

    expect(dark.get("--color-accent")).toBe("var(--mint-400)");
    expect(light.get("--color-accent")).toBe("var(--teal-700)");
    expect(dark.get("--shadow-1")).toMatch(/^inset 0 1px 0 var\(--sheen\), 0 1px 2px/);
    expect([...light.keys()].sort()).toEqual([...dark.keys()].sort());
  });

  it("returns empty themes when the blocks are missing", () => {
    const { dark, light } = parseThemes("");
    expect(dark.size).toBe(0);
    expect(light.size).toBe(0);
  });
});

describe("resolveValue", () => {
  const tokens = new Map([
    ["--a", "var(--b)"],
    ["--b", "#fff"],
    ["--loop", "var(--loop)"],
  ]);

  it("follows references down to a literal", () => {
    expect(resolveValue("var(--a)", tokens)).toBe("#fff");
  });

  it("leaves unknown references and non-references alone", () => {
    expect(resolveValue("var(--missing)", tokens)).toBe("var(--missing)");
    expect(resolveValue("12px", tokens)).toBe("12px");
  });

  it("stops on a reference loop", () => {
    expect(resolveValue("var(--loop)", tokens)).toBe("var(--loop)");
  });
});
