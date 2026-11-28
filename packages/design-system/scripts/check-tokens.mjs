#!/usr/bin/env node
/*
 * Fails when CSS uses a raw colour, font size, weight, spacing, radius or z-index instead of a token.
 * Usage: node check-tokens.mjs <dir or .css file>...
 * A line with a `token-exempt: <reason>` comment is skipped. tokens.css is where raw values belong.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const RAW_COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i;
const LENGTH_PROPS =
  /^(?:font-size|gap|row-gap|column-gap|padding(?:-[a-z]+)*|margin(?:-[a-z]+)*|border(?:-[a-z]+)*-radius)$/;
const NUMBER_PROPS = /^(?:font-weight|z-index)$/;
// px or rem lengths; 1px hairlines are allowed.
const RAW_LENGTH = /(?<![\w-])-?(?:\d*\.)?\d+(?:px|rem)\b/g;
// The reason is required: `token-exempt: */` alone does not count.
const EXEMPT = /token-exempt:\s*[^*\s]/;

/** Removes `var(--name)` references (but not their fallbacks), so only hand-written values remain. */
const stripVars = (value) => value.replace(/var\(--[\w-]+\)/g, "");

function problemFor(property, value) {
  if (RAW_COLOUR.test(value)) return `raw colour in ${property}: ${value}`;

  if (LENGTH_PROPS.test(property)) {
    const raw = (stripVars(value).match(RAW_LENGTH) ?? []).filter((v) => !/^-?1px$/.test(v));
    if (raw.length > 0) return `raw ${property}: ${raw.join(" ")} (use a token)`;
  }

  if (NUMBER_PROPS.test(property)) {
    const rest = stripVars(value);
    // calc(var(--z-popover) + 1) is fine: it is still anchored to a token.
    if (/\bcalc\(/.test(value) && /var\(/.test(value)) return null;
    if (/\b\d+\b/.test(rest) && !/^\s*0\s*$/.test(rest)) {
      return `raw ${property}: ${value} (use a token)`;
    }
  }
  return null;
}

/** Returns `{ line, message }` for every raw value in a CSS source. */
export function checkCss(css) {
  const problems = [];
  let inComment = false;

  css.split("\n").forEach((original, index) => {
    if (EXEMPT.test(original)) return;

    // Drop comments, keeping track of ones that span lines.
    let line = "";
    let rest = original;
    while (rest.length > 0) {
      if (inComment) {
        const end = rest.indexOf("*/");
        if (end === -1) return;
        inComment = false;
        rest = rest.slice(end + 2);
      } else {
        const start = rest.indexOf("/*");
        if (start === -1) {
          line += rest;
          break;
        }
        line += rest.slice(0, start);
        inComment = true;
        rest = rest.slice(start + 2);
      }
    }

    // Selectors and at-rules (media queries) carry px values legitimately.
    if (line.includes("{") || line.trim() === "") return;

    const declaration = line.match(/^\s*([a-z-]+)\s*:\s*(.*?);?\s*}?\s*$/i);
    const property = declaration?.[1].toLowerCase();
    const value = declaration?.[2] ?? line;

    const message = property
      ? problemFor(property, value)
      : RAW_COLOUR.test(line)
        ? `raw colour: ${line.trim()}`
        : null;
    if (message) problems.push({ line: index + 1, message });
  });

  return problems;
}

async function cssFiles(path) {
  if ((await stat(path)).isFile()) return path.endsWith(".css") ? [path] : [];
  const entries = await readdir(path, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => join(entry.parentPath, entry.name));
}

async function main(paths) {
  if (paths.length === 0) {
    console.error("usage: check-tokens <dir or .css file>...");
    return 2;
  }
  const files = (await Promise.all(paths.map(cssFiles))).flat().sort();
  let count = 0;

  for (const file of files) {
    if (basename(file) === "tokens.css") continue;
    for (const { line, message } of checkCss(await readFile(file, "utf8"))) {
      console.error(`${relative(process.cwd(), file)}:${line}  ${message}`);
      count += 1;
    }
  }

  if (count > 0) {
    console.error(
      `\n${count} raw value(s). Use a token from @meddash/design-system, or add ` +
        "`/* token-exempt: <reason> */` on the line.",
    );
    return 1;
  }
  console.log(`check-tokens: ${files.length} CSS files, no raw values.`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
