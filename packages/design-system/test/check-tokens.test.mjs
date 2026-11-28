import assert from "node:assert/strict";
import { test } from "node:test";

import { checkCss } from "../scripts/check-tokens.mjs";

const rule = (...declarations) => `.a {\n${declarations.map((d) => `  ${d};`).join("\n")}\n}\n`;
const messages = (css) => checkCss(css).map((p) => p.message);

test("passes on tokens and allowed values", () => {
  const css = rule(
    "color: var(--color-text)",
    "font-size: var(--text-md)",
    "font-weight: var(--weight-semibold)",
    "gap: var(--space-2) var(--space-4)",
    "padding: 0 var(--space-3) calc(var(--space-3) + env(safe-area-inset-bottom))",
    "margin: 0 auto",
    "margin-top: -1px",
    "border-radius: 50%",
    "border-top-left-radius: var(--radius-sm)",
    "z-index: var(--z-popover)",
    "z-index: calc(var(--z-popover) + 1)",
    "z-index: 0",
    "width: 240px",
    "font: inherit",
    "font-weight: inherit",
    "white-space: nowrap",
  );
  assert.deepEqual(checkCss(css), []);
});

test("ignores selectors, media queries and comments", () => {
  const css = [
    "@media (max-width: 720px) {",
    "  /* was #fff and 14px */",
    "  #root > .a {",
    "    /*",
    "     * gap: 6px",
    "     */",
    "    color: var(--color-text);",
    "  }",
    "}",
  ].join("\n");
  assert.deepEqual(checkCss(css), []);
});

test("fails on each banned pattern", () => {
  const cases = [
    "color: #b54708",
    "background: rgb(16 24 20 / 40%)",
    "box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)",
    "color: hsl(10 50% 50%)",
    "font-size: 14px",
    "font-size: 0.875rem",
    "font-weight: 650",
    "gap: 6px",
    "row-gap: 2px",
    "padding: 0 14px",
    "padding-inline: 10px",
    "margin-top: -10px",
    "border-radius: 8px",
    "border-top-left-radius: 4px",
    "z-index: 20",
    "padding: var(--space-2, 8px)",
    "padding: calc(var(--space-3) + 2px)",
  ];
  for (const declaration of cases) {
    assert.equal(messages(rule(declaration)).length, 1, declaration);
  }
});

test("reports the line number", () => {
  assert.deepEqual(
    checkCss(rule("color: var(--color-text)", "gap: 6px")).map((p) => p.line),
    [3],
  );
});

test("honours token-exempt with a reason", () => {
  assert.deepEqual(checkCss(rule("gap: 2px /* token-exempt: optical nudge */")), []);
  assert.equal(checkCss(rule("gap: 2px /* token-exempt: */")).length, 1);
});

test("finds a raw colour in a multi-line value", () => {
  const css = ".a {\n  box-shadow:\n    0 1px 2px #000,\n    0 0 0 var(--x);\n}\n";
  assert.deepEqual(
    checkCss(css).map((p) => p.line),
    [3],
  );
});
