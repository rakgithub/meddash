import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const read = (name) => readFile(new URL(`../src/${name}`, import.meta.url), "utf8");

/** Custom properties declared inside the first block that starts with `selector {`. */
function declaredIn(css, selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `no block for ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  return [...body.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]).sort();
}

test("the dark and light themes set the same tokens", async () => {
  const themes = await read("themes.css");
  const dark = declaredIn(themes, ":root");
  const light = declaredIn(themes, ':root[data-theme="light"]');

  assert.ok(dark.includes("--color-accent"), "dark theme should set --color-accent");
  assert.deepEqual(light, dark);
});

test("every token the themes use is defined", async () => {
  const [tokens, themes] = await Promise.all([read("tokens.css"), read("themes.css")]);
  const css = tokens + themes;
  const defined = new Set([...css.matchAll(/(--[\w-]+):/g)].map((m) => m[1]));
  const used = new Set([...themes.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]));

  assert.deepEqual(
    [...used].filter((name) => !defined.has(name)),
    [],
  );
});
