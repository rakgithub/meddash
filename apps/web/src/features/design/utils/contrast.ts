/** [r, g, b] in 0–255 for `#rgb` or `#rrggbb`, else null (named colours, color-mix, …). */
function parseHex(colour: string): [number, number, number] | null {
  const match = colour.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return [channel(0), channel(2), channel(4)];
}

/** WCAG 2 relative luminance. */
function luminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2 contrast ratio between two hex colours (1–21), or null when either is not a hex colour. */
export function contrastRatio(a: string, b: string): number | null {
  const first = parseHex(a);
  const second = parseHex(b);
  if (!first || !second) return null;
  const [light, dark] = [luminance(first), luminance(second)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}
