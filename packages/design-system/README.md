# @meddash/design-system

The look of MedDash as CSS custom properties (tokens): colour, type, spacing, radii, shadows, motion,
layering and layout sizes. Dark is the default theme; `data-theme="light"` on `<html>` switches to light.

To see every token, run `pnpm dev` and open <http://localhost:5173/design> (development builds only).
It reads this package's CSS directly, so it is always up to date, and it shows each colour pair's
contrast in both themes.

## Use

`apps/web` imports the CSS once, in `main.tsx`:

```ts
import "@meddash/design-system/index.css";
```

Then any CSS Module uses the tokens:

```css
.card {
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--text-base);
}
```

## Components

```tsx
import { Button, Chip, Notice } from "@meddash/design-system/components";
```

| Component     | For                                                                                  |
| ------------- | ------------------------------------------------------------------------------------ |
| `Button`      | `primary`, `secondary`, `ghost`; `md`, `lg`; `busy`; with `href`, the app's link     |
| `IconButton`  | An icon-only button; `label` is required and is its accessible name                  |
| `TextField`   | A labelled input; `hint` and `error` are read with it through `aria-describedby`     |
| `SearchField` | `TextField` of type search, with a magnifier                                         |
| `Chip`        | A toggle (`pressed`) for filters, or an `accent` one-shot choice; `meta` for a count |
| `Badge`       | A status (`neutral`, `accent`, `caution`, `danger`) or a `count` with a read label   |
| `Notice`      | `info`, `caution`, `danger` with an icon; optional title, heading level and role     |

`Button href` renders through `LinkProvider`, which the app sets once at the root with its router
link, so the package needs no router. Without a provider it renders a plain `<a>`. Components take no
`className`; add a variant instead. `/design` shows each one in every state.

## Files

| File                       | Holds                                                                      |
| -------------------------- | -------------------------------------------------------------------------- |
| `src/tokens.css`           | Primitives: raw values with neutral names (`--teal-700`, `--space-4`)      |
| `src/themes.css`           | Semantic tokens per theme (`--color-accent`); dark in `:root`, then light  |
| `src/base.css`             | Reset, body, headings font, focus ring, reduced motion, `.visually-hidden` |
| `src/index.css`            | Imports the three above, in that order                                     |
| `src/components/`          | The React components, each with its CSS Module and tests                   |
| `scripts/check-tokens.mjs` | The token guard run by `pnpm verify:web` and this package's `verify`       |

## Semantic colours

| Token                                              | For                                                   |
| -------------------------------------------------- | ----------------------------------------------------- |
| `--color-bg`, `--color-bg-glow`                    | The page, and the glow at the top of it               |
| `--color-surface`, `--color-surface-raised`        | Cards and panels; popovers and menus over them        |
| `--color-border`, `--color-border-strong`          | Dividers and card edges; edges that need to show more |
| `--color-input-border`                             | Text field edges (3:1 against the surface)            |
| `--color-text`                                     | Body text and headings                                |
| `--color-text-secondary`, `--color-text-muted`     | Supporting text; hints, captions and metadata         |
| `--color-accent`, `--color-accent-hover`           | Primary actions and links, and their hover            |
| `--color-on-accent`                                | Text and icons on an accent fill                      |
| `--color-accent-soft`, `--color-accent-soft-hover` | Soft accent fills (selected chips, highlights)        |
| `--color-caution`, `--color-caution-soft`          | Warnings: text, and the fill behind it                |
| `--color-danger`, `--color-danger-soft`            | Errors and destructive actions: text, and the fill    |
| `--color-focus`                                    | The focus ring                                        |
| `--color-scrim`                                    | The dimmed layer behind drawers and dialogs           |

Every other token group (type, space, radii, shadows, motion, `--z-*`, layout) is the same name in
both themes except shadows, which each theme sets for itself.

## Do and don't

- Do use semantic tokens in app and component CSS. Don't use primitives (`--ink-950`, `--teal-700`)
  outside `themes.css`: a theme can't re-point them.
- Do add a token when nothing fits. Don't write a one-off value; `check-tokens` fails on raw colours,
  font sizes, weights, spacing, radii and z-index. A justified exception takes a
  `/* token-exempt: <reason> */` comment on the same line.
- Do snap to the scale (`--space-3` rather than 14px). The scale is small on purpose.
- Don't restyle a shared component from outside. Components take no `className` for restyling; add a
  variant to the component instead.

## Add a token

1. Add the primitive to `tokens.css`, in its group, if the raw value is new.
2. For a colour, add the semantic token to both theme blocks in `themes.css`. `pnpm verify:design-system`
   fails if one theme sets a token the other doesn't.
3. If it is a text or edge colour, add its pair to `PAIRS` in
   `apps/web/src/features/design/components/StyleGuidePage/StyleGuidePage.tsx` and check `/design`
   shows it passing in both themes (4.5:1 for text, 3:1 for input edges).
4. Add a row to the semantic colours table above.
