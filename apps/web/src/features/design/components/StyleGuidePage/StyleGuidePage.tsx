import tokensCss from "@meddash/design-system/tokens.css?raw";
import themesCss from "@meddash/design-system/themes.css?raw";
import { useState, type CSSProperties } from "react";
import { PageTitle } from "../../../../lib/PageTitle";
import { contrastRatio } from "../../utils/contrast";
import { parseThemes, parseTokenGroups, resolveValue, type Token } from "../../utils/parseTokens";
import styles from "./StyleGuidePage.module.css";

// Read from the package's own CSS, so the page lists every token and cannot drift from it.
const groups = parseTokenGroups(tokensCss);
const themes = parseThemes(themesCss);
const primitives = new Map(groups.flatMap((g) => g.tokens.map((t) => [t.name, t.value] as const)));
const semanticColours = [...themes.dark.keys()].filter((name) => name.startsWith("--color-"));
const shadows = [...themes.dark.keys()].filter((name) => name.startsWith("--shadow-"));

interface Pair {
  fg: string;
  bg: string;
  /** Text needs 4.5:1 (WCAG AA); an input's edge is not text and needs 3:1. */
  kind: "text" | "edge";
}

// The pairs the app actually puts together; each must pass in both themes.
const PAIRS: Pair[] = [
  { fg: "--color-text", bg: "--color-bg", kind: "text" },
  { fg: "--color-text", bg: "--color-surface", kind: "text" },
  { fg: "--color-text-secondary", bg: "--color-surface", kind: "text" },
  { fg: "--color-text-muted", bg: "--color-bg", kind: "text" },
  { fg: "--color-text-muted", bg: "--color-surface", kind: "text" },
  { fg: "--color-accent", bg: "--color-bg", kind: "text" },
  { fg: "--color-on-accent", bg: "--color-accent", kind: "text" },
  { fg: "--color-accent", bg: "--color-accent-soft", kind: "text" },
  { fg: "--color-caution", bg: "--color-surface", kind: "text" },
  { fg: "--color-caution", bg: "--color-caution-soft", kind: "text" },
  { fg: "--color-danger", bg: "--color-bg", kind: "text" },
  { fg: "--color-danger", bg: "--color-danger-soft", kind: "text" },
  { fg: "--color-input-border", bg: "--color-surface", kind: "edge" },
];

type ThemeName = "dark" | "light";
const THEMES: ThemeName[] = ["dark", "light"];

/*
 * The one place the app sets inline styles: each sample needs its own token, and a class per token
 * would repeat tokens.css by hand. Only custom properties are set; the CSS module does the styling.
 */
type SampleStyle = CSSProperties & Record<`--${string}`, string>;

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
/** `var(--ink-950)` → `ink-950`, for a compact label. */
const shortName = (value: string) => value.replace(/^var\(--([\w-]+)\)$/, "$1");

type Kind =
  | "colour"
  | "font"
  | "text"
  | "weight"
  | "leading"
  | "tracking"
  | "space"
  | "radius"
  | "ease"
  | "duration"
  | "plain";

function kindOf({ name, value }: Token): Kind {
  if (value.startsWith("#")) return "colour";
  const prefix = name.match(/^--([a-z]+)-/)?.[1];
  switch (prefix) {
    case "font":
    case "text":
    case "weight":
    case "leading":
    case "tracking":
    case "space":
    case "radius":
    case "ease":
    case "duration":
      return prefix;
    default:
      return "plain";
  }
}

const SAMPLE_TEXT = "Find the right medicine";

function TokenSample({ token, played }: { token: Token; played: boolean }) {
  const kind = kindOf(token);
  const style: SampleStyle = { "--sample": `var(${token.name})` };

  switch (kind) {
    case "font":
    case "text":
    case "weight":
    case "tracking":
      return (
        <span className={styles[`${kind}Sample`]} style={style}>
          {SAMPLE_TEXT}
        </span>
      );
    case "leading":
      return (
        <span className={styles.leadingSample} style={style}>
          Take one tablet with water. Do not take more than three in a day.
        </span>
      );
    case "space":
      return <span className={styles.spaceSample} style={style} />;
    case "radius":
      return <span className={styles.radiusSample} style={style} />;
    case "ease":
    case "duration":
      return (
        <span className={styles.track}>
          <span
            className={`${styles[`${kind}Dot`]} ${played ? styles.dotMoved : ""}`}
            style={style}
          />
        </span>
      );
    default:
      return null;
  }
}

function Swatch({ value, label }: { value: string; label: string }) {
  const style: SampleStyle = { "--sample": value };
  return (
    <span className={styles.swatchLine}>
      <span className={styles.swatch} style={style} />
      <code>{label}</code>
    </span>
  );
}

function ContrastCell({ pair, theme }: { pair: Pair; theme: ThemeName }) {
  const tokens = themes[theme];
  const fg = tokens.get(pair.fg) ?? "";
  const bg = tokens.get(pair.bg) ?? "";
  const ratio = contrastRatio(resolveValue(fg, primitives), resolveValue(bg, primitives));
  const minimum = pair.kind === "text" ? 4.5 : 3;
  const style: SampleStyle = { "--fg": fg, "--bg": bg };

  return (
    <td>
      <span className={styles.contrastCell}>
        <span className={pair.kind === "text" ? styles.chip : styles.edgeChip} style={style}>
          {pair.kind === "text" ? "Aa" : ""}
        </span>
        {ratio === null ? (
          <span>Not a solid colour</span>
        ) : (
          <span>
            {ratio.toFixed(1)}:1{" "}
            <span className={ratio >= minimum ? styles.pass : styles.fail}>
              {ratio >= minimum ? "passes" : `fails, needs ${minimum}:1`}
            </span>
          </span>
        )}
      </span>
    </td>
  );
}

export function StyleGuidePage() {
  const [played, setPlayed] = useState(false);

  return (
    <div className={styles.page}>
      <PageTitle title="Design tokens" />
      <header className={styles.intro}>
        <h1>Design tokens</h1>
        <p>
          Every token in <code>@meddash/design-system</code>, read from its CSS. Colours and
          contrast show both themes; everything else follows the theme switch in the header. App CSS
          uses the semantic tokens; the primitives are listed so you can see what they point at.
        </p>
        <p className={styles.devNote}>This page exists only in development builds.</p>
      </header>

      <nav aria-label="Sections" className={styles.contents}>
        <ul>
          <li>
            <a href="#semantic-colours">Semantic colours</a>
          </li>
          <li>
            <a href="#contrast">Contrast</a>
          </li>
          {groups.map((group) => (
            <li key={group.title}>
              <a href={`#${slug(group.title)}`}>{group.title}</a>
            </li>
          ))}
          <li>
            <a href="#shadows">Shadows</a>
          </li>
        </ul>
      </nav>

      <section aria-labelledby="semantic-colours" className={styles.section}>
        <h2 id="semantic-colours">Semantic colours</h2>
        <p className={styles.lead}>What app and component CSS uses. Themes only re-point these.</p>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Dark</th>
                <th scope="col">Light</th>
              </tr>
            </thead>
            <tbody>
              {semanticColours.map((name) => (
                <tr key={name}>
                  <th scope="row">
                    <code>{name}</code>
                  </th>
                  {THEMES.map((theme) => {
                    const value = themes[theme].get(name) ?? "";
                    return (
                      <td key={theme}>
                        <Swatch value={value} label={shortName(value)} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="contrast" className={styles.section}>
        <h2 id="contrast">Contrast</h2>
        <p className={styles.lead}>
          Text needs 4.5:1 against its background; an input’s edge needs 3:1 against the surface.
        </p>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Pair</th>
                <th scope="col">Dark</th>
                <th scope="col">Light</th>
              </tr>
            </thead>
            <tbody>
              {PAIRS.map((pair) => (
                <tr key={`${pair.fg} ${pair.bg}`}>
                  <th scope="row">
                    <code>{pair.fg}</code> on <code>{pair.bg}</code>
                  </th>
                  {THEMES.map((theme) => (
                    <ContrastCell key={theme} pair={pair} theme={theme} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {groups.map((group) => {
        const id = slug(group.title);
        const colours = group.tokens.every((token) => kindOf(token) === "colour");
        const motion = group.tokens.some((token) => kindOf(token) === "ease");

        return (
          <section key={group.title} aria-labelledby={id} className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 id={id}>{group.title}</h2>
              {motion && (
                <button type="button" className={styles.play} onClick={() => setPlayed(!played)}>
                  {played ? "Move back" : "Play"}
                </button>
              )}
            </div>
            {colours ? (
              <ul className={styles.swatchGrid}>
                {group.tokens.map((token) => (
                  <li key={token.name} className={styles.swatchCard}>
                    <Swatch value={`var(${token.name})`} label={token.name} />
                    <span className={styles.value}>{token.value}</span>
                    {token.note && <span className={styles.note}>{token.note}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <ul className={styles.rows}>
                {group.tokens.map((token) => (
                  <li key={token.name} className={styles.row}>
                    <span className={styles.rowName}>
                      <code>{token.name}</code>
                      <span className={styles.value}>{token.value}</span>
                      {token.note && <span className={styles.note}>{token.note}</span>}
                    </span>
                    <TokenSample token={token} played={played} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section aria-labelledby="shadows" className={styles.section}>
        <h2 id="shadows">Shadows</h2>
        <p className={styles.lead}>Each theme sets its own; shown here in the current one.</p>
        <ul className={styles.shadowGrid}>
          {shadows.map((name) => {
            const style: SampleStyle = { "--sample": `var(${name})` };
            return (
              <li key={name} className={styles.shadowCard} style={style}>
                <code>{name}</code>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
