export interface Token {
  name: string;
  value: string;
  /** The comment written next to or just above the token in the CSS, if any. */
  note?: string;
}

export interface TokenGroup {
  title: string;
  tokens: Token[];
}

/** The body of the first rule whose selector is exactly `selector`, or "" when there is none. */
function blockBody(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return "";
  const open = css.indexOf("{", start) + 1;
  return css.slice(open, css.indexOf("}", open));
}

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

/** `--name: value` pairs in a rule body, with values that span lines folded onto one. */
function declarations(body: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const part of stripComments(body).split(";")) {
    const match = part.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (match) result.set(match[1], match[2].replace(/\s+/g, " "));
  }
  return result;
}

/**
 * The primitives in tokens.css, grouped by the one-line comments that head each group
 * (`/* Dark surfaces *\/`). A comment straight after a token, or on the line above one inside a group,
 * becomes that token's note.
 */
export function parseTokenGroups(tokensCss: string): TokenGroup[] {
  const groups: TokenGroup[] = [];
  let pendingNote: string | undefined;
  let previous = "{";

  for (const raw of blockBody(tokensCss, ":root").split("\n")) {
    const line = raw.trim();
    const comment = line.match(/^\/\*\s*(.*?)\s*\*\/$/);
    const declaration = line.match(/^(--[\w-]+)\s*:\s*(.+?);\s*(?:\/\*\s*(.*?)\s*\*\/)?$/);

    if (comment && (previous === "" || previous.endsWith("{"))) {
      // "Motion: one easing per job, …" → "Motion"; the rest is commentary, not a title.
      groups.push({ title: comment[1].split(/[:;]/)[0].trim(), tokens: [] });
    } else if (comment) {
      pendingNote = comment[1];
    } else if (declaration && groups.length > 0) {
      const note = declaration[3] ?? pendingNote;
      groups[groups.length - 1].tokens.push({
        name: declaration[1],
        value: declaration[2],
        ...(note ? { note } : {}),
      });
      pendingNote = undefined;
    }
    previous = line;
  }
  return groups;
}

export interface Themes {
  dark: Map<string, string>;
  light: Map<string, string>;
}

/** The semantic tokens each theme in themes.css sets, as written (`var(--ink-950)`). */
export function parseThemes(themesCss: string): Themes {
  return {
    dark: declarations(blockBody(themesCss, ":root")),
    light: declarations(blockBody(themesCss, ':root[data-theme="light"]')),
  };
}

/** Follows `var(--x)` references through `tokens` down to a literal value. */
export function resolveValue(value: string, tokens: Map<string, string>, depth = 0): string {
  const reference = value.match(/^var\((--[\w-]+)\)$/);
  if (!reference || depth > 10) return value;
  const next = tokens.get(reference[1]);
  return next === undefined ? value : resolveValue(next, tokens, depth + 1);
}
