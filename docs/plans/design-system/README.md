# Plan — MedDash design system (`packages/design-system`)

Status: draft 2026-11-28, awaiting approval of the decisions below.
Roadmap entry: [Track — Design system](../../PLAN.md#track--design-system).
Design reference: the v5 artboards ("Minimal: v3 theme, top-right nav, new intro") on the
[MedDash Assistant-first redesign canvas](https://claude.ai/artifact/HetAhLGzNv28APeN9KccPa).

## Goal

- A new workspace package, `@meddash/design-system`, is the single source of truth for the look of
  MedDash: colours, fonts, type scale, spacing, radii, shadows, motion and layout sizes, as CSS custom
  properties (tokens), plus a small set of shared React components built only from those tokens.
- The theme is the dark teal and mint look the redesign settled on (v3 and v5 on the canvas), with
  Bricolage Grotesque for headings and Inter for text.
- Anything new in `apps/web` uses the tokens. A check in `pnpm verify` fails when a CSS file uses a raw
  colour, font size or spacing value instead of a token, so drift is caught in CI, not in review.
- This plan sets up the system and moves the current app onto it. The assistant-first redesign itself
  (intro animation, assistant as home, top-right nav) is the next plan and builds on this one.

## Where things stand

- Tokens live in [`apps/web/src/styles/global.css`](../../../apps/web/src/styles/global.css): about 40
  custom properties for a light "blister" theme and a dark override, toggled by `ThemeToggle` and
  [`lib/theme.ts`](../../../apps/web/src/lib/theme.ts).
- Colours are mostly tokenised already (2 raw hex values and 3 `rgb()` across 48 `*.module.css`).
- Type and spacing are not: 15 different `font-size` values (11–34px) and about 20 spacing values
  (1–72px, including 6, 10, 14, 18 and 22px) are written by hand, and there is a stray weight of 650.
- The font is Geologica from Google Fonts, linked in [`apps/web/index.html`](../../../apps/web/index.html).
- The workspace only has `apps/*`. There is no shared package yet.

## Decisions to make first

1. **Package shape: plain CSS tokens plus React components, shipped as source.** No build step: the
   package's `exports` point at `src/*.css` and `src/index.ts`, and Vite, Vitest and `tsc` in
   `apps/web` read the source directly. A build (tsup, Style Dictionary) can come later if a second app
   needs a published package.
2. **Tokens written as CSS, not JSON.** `tokens.css` is what the browser uses, and it can be read on
   its own. Alternative: JSON plus Style Dictionary to generate CSS, TS and native tokens. That is a new
   dependency and a build step, worth it only once a native app or Figma sync exists.
3. **Two layers of tokens.** _Primitives_ are raw values with neutral names (`--teal-700`,
   `--space-4`). _Semantic_ tokens say what a value is for (`--color-accent`, `--color-text-muted`).
   Components and app CSS use semantic tokens only. Themes only re-point semantic tokens.
4. **Dark is the default theme; light stays.** The app already has a light/dark toggle with tests, so
   keep both and rebuild the light theme from the light surfaces the redesign used for Medicines and
   Checkout. A first visit with no saved choice gets dark, whatever the OS prefers.
   Alternative: follow the OS preference as today, or drop light and the toggle (simpler, but removes a
   feature people have).
5. **Fonts: Bricolage Grotesque (headings) and Inter (text), still from Google Fonts.** Same loading
   as today, so nothing new. Self-hosting the `woff2` files in the package (better privacy, no third
   party request) is a follow-up.
6. **The guard is a small script, not Stylelint.** `scripts/check-tokens.mjs` in the package scans
   `apps/web/src/**/*.css` and the package's own CSS. It fails on hex, `rgb()`/`hsl()` colours, `px`
   or `rem` values for `font-size`, `gap`, `padding`, `margin`, `border-radius` and `z-index` values
   outside `tokens.css`. Allowed: `0`, `1px` borders, `%`, `fr`, `auto`, `calc()` of tokens. A
   `/* token-exempt: <reason> */` comment on the line allows a justified exception.
   Alternative: Stylelint with `stylelint-declaration-strict-value`. Better messages and editor
   integration, but two new dev dependencies.
7. **No Storybook.** A dev-only page at `/design` in `apps/web` shows every token and component.
   It is not in production builds (`import.meta.env.DEV`).
8. **New dependencies: none at runtime.** The package needs its own dev tooling (the versions
   `apps/web` already uses): `typescript`, `vitest`, `jsdom`, `@testing-library/react`,
   `@testing-library/user-event`, `@testing-library/jest-dom`, `eslint` and its plugins, `prettier`.
   Each is added with `pnpm add -D --filter @meddash/design-system`, after approval.

## The tokens

Values come from the v3 and v5 designs. Every text and background pair below was checked for contrast.

### Colour primitives

| Token                                      | Value                             | Used for                                                                |
| ------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------- |
| `--ink-950`                                | `#0C1517`                         | Dark page background                                                    |
| `--ink-900`                                | `#0F1B1D`                         | Dark workspace background                                               |
| `--ink-850`                                | `#12302C`                         | Glow at the top of dark views                                           |
| `--ink-800`                                | `#13211F`                         | Raised dark surfaces (popovers)                                         |
| `--mint-400`                               | `#5FD4BF`                         | Accent on dark                                                          |
| `--teal-700` / `--teal-800`                | `#0F766E` / `#0B5F58`             | Accent on light, and its hover                                          |
| `--teal-50`                                | `#E6F4F1`                         | Soft accent fill on light                                               |
| `--fog-100`                                | `#EAF2F0`                         | Text on dark                                                            |
| `--sage-200` / `--sage-400` / `--sage-500` | `#CFE3DE` / `#B7C7C3` / `#8FA5A0` | Secondary and muted text on dark                                        |
| `--mist-50`                                | `#F4F6F5`                         | Light page background                                                   |
| `--slate-900` / `--slate-500`              | `#1B2230` / `#5C6575`             | Text and muted text on light                                            |
| `--line-200` / `--line-300` / `--line-500` | `#DCE0E6` / `#C3C9D2` / `#858D99` | Borders; `--line-500` is the 3:1 input edge                             |
| `--amber-300`                              | `#F3C77A`                         | Caution text on dark                                                    |
| `--red-400` / `--red-700`                  | `#F97066` / `#B42318`             | Danger on dark / on light                                               |
| `--cat-*`                                  | 12 hues                           | One capsule colour per category (all 12 categories, not just today's 4) |

### Semantic colour tokens (re-pointed per theme)

`--color-bg`, `--color-bg-glow`, `--color-surface`, `--color-surface-raised`, `--color-border`,
`--color-border-strong`, `--color-input-border`, `--color-text`, `--color-text-secondary`,
`--color-text-muted`, `--color-accent`, `--color-accent-hover`, `--color-on-accent`,
`--color-accent-soft`, `--color-caution`, `--color-caution-soft`, `--color-danger`,
`--color-danger-soft`, `--color-focus`, `--color-scrim`.

Checked pairs (WCAG AA needs 4.5:1 for text, 3:1 for input edges):

| Text on background                                                     | Ratio     |
| ---------------------------------------------------------------------- | --------- |
| `--fog-100` on `--ink-950`                                             | 16.3      |
| `--sage-500` (muted) on `--ink-950` / `--ink-900`                      | 7.1 / 6.7 |
| `--mint-400` on `--ink-950`, and `--ink-950` on `--mint-400` (buttons) | 10.3      |
| `--amber-300` on `--ink-900`                                           | 11.1      |
| `--red-400` on `--ink-950`                                             | 6.6       |
| `--slate-900` on `--mist-50`                                           | 14.7      |
| `--slate-500` on `--mist-50` / white                                   | 5.4 / 5.9 |
| white on `--teal-700`                                                  | 5.5       |
| `--teal-800` on `--teal-50`                                            | 6.7       |
| `--line-500` input edge on white                                       | 3.4       |

### Type

- `--font-display: "Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif`
- `--font-body: Inter, ui-sans-serif, system-ui, sans-serif`
- Scale, down from today's 15 sizes to 9: `--text-xs` 12px, `--text-sm` 13px, `--text-md` 14px,
  `--text-base` 15px, `--text-lg` 17px, `--text-xl` 20px, `--text-2xl` 26px, `--text-3xl` 34px,
  `--text-display` `clamp(42px, 6.4vw, 92px)`. Today's 16, 18, 19, 24, 28 and 32px snap to the nearest
  step; the PR shows each change.
- Weights: `--weight-regular` 400, `--weight-medium` 500, `--weight-semibold` 600, `--weight-bold` 700.
  The 650 goes.
- Line heights: `--leading-tight` 1, `--leading-snug` 1.3, `--leading-normal` 1.55.
- Tracking for display type: `--tracking-display` -0.035em.

### Space, shape, depth, motion, layout

- Space on a 4px grid: `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px,
  `--space-5` 20px, `--space-6` 24px, `--space-8` 32px, `--space-10` 40px, `--space-12` 48px,
  `--space-16` 64px, `--space-18` 72px. Today's 2, 3, 6, 10, 14, 18, 22 and 28px snap to the nearest
  step, except hairline offsets marked `token-exempt`.
- Radii: `--radius-sm` 12px, `--radius-md` 18px, `--radius-lg` 24px, `--radius-xl` 28px,
  `--radius-pill` 999px. The blister "well" keeps its look as `--well-bg` and `--well-shadow`.
- Shadows: `--shadow-1` (cards), `--shadow-2` (hover, floating bars), `--shadow-overlay` (drawers,
  popovers). Dark and light each define their own.
- Motion: keep today's `--ease-out`, `--ease-in`, `--ease-in-out` and `--duration-fast/base/slow`.
  `base.css` keeps the global reduced-motion safety net.
- Layering: `--z-header`, `--z-popover`, `--z-scrim`, `--z-drawer`.
- Layout: `--header-height` 64px, `--width-chat` 720px, `--width-page` 1040px, `--tap-target` 44px.

## Package layout

```
packages/design-system/
  package.json            name @meddash/design-system, private, exports below
  CLAUDE.md               rules for using and changing the system
  README.md               tokens table, how to use, do and don't
  scripts/check-tokens.mjs
  src/
    tokens.css            primitives (theme-independent)
    themes.css            semantic tokens: :root (dark, default) and [data-theme="light"]
    base.css              reset, body, focus ring, reduced motion, .visually-hidden
    index.css             imports tokens, themes, base, in that order
    index.ts              component exports
    components/<Name>/<Name>.tsx + .module.css + .test.tsx
```

`exports`: `"./index.css"`, `"./tokens.css"`, `"."` (components). `apps/web` adds
`"@meddash/design-system": "workspace:*"` and imports `@meddash/design-system/index.css` once in
`main.tsx`. `global.css` shrinks to app-only layout (the `#root` column).

## Steps

Each PR leaves the app working and passes `pnpm verify`. UI PRs commit before and after screenshots
under `docs/screenshots/design-system/` and link them from the PR.

### PR 1 — Package, tokens and theme switch

1. Add `packages/*` to `pnpm-workspace.yaml`. Create the package with `tokens.css`, `themes.css`,
   `base.css` and `index.css` as above; move the reset, focus and reduced-motion rules out of
   `global.css`.
2. Keep every existing class working: a temporary alias block in `themes.css` maps today's names to
   the new ones (`--accent: var(--color-accent)`, `--text-muted: var(--color-text-muted)`, …), so no
   `*.module.css` changes in this PR. The block is marked for removal in PR 2.
3. Swap Geologica for Bricolage Grotesque and Inter in `index.html`. Headings take `--font-display`
   through `base.css`.
4. Dark by default: `readTheme()` returns the saved choice, else `"dark"`. Update its test.
5. Package tooling: `typecheck`, `lint`, `format:check`, `test`, and `verify`. Root gains
   `verify:design-system`, and `verify` runs it first.
6. Tests: theme default; a small test that every semantic token exists in both themes (parse
   `themes.css`, compare the two lists).

The whole app changes colour and font in this PR, with no layout change. The screenshots cover the
products list, product detail, assistant, cart and orders in both themes at desktop and phone widths.

### PR 2 — Move the app onto the tokens and turn on the guard

1. Add `scripts/check-tokens.mjs` (decision 6) with its own test on sample CSS: passes on tokens,
   fails on each banned pattern, honours `token-exempt`.
2. Replace raw values in every `*.module.css` with tokens: font sizes, weights, spacing, radii,
   z-index, the 5 raw colours. Rename uses of the old token names to the semantic names.
3. Delete the alias block.
4. Add the check to `pnpm verify:web` once it reports zero problems.

This is a large mechanical diff. If it is too big to review, split it by feature: products, assistant,
then cart, orders and auth, with the guard turned on in the last one.

### PR 3 — Core components

Built in the package from tokens only, each with tests (role-based queries, `userEvent`, keyboard
behaviour):

- `Button` — `primary`, `secondary`, `ghost`; `md` and `lg`; `disabled` and busy states; renders a
  `<button>` or, with `href`, a router link supplied by the app.
- `IconButton` — required `label` for the accessible name.
- `TextField` and `SearchField` — visible label, hint and error text wired with `aria-describedby`.
- `Chip` — toggle chip with `aria-pressed`, for categories and quick replies.
- `Badge` — count and status variants (order status reuses it).
- `Notice` — `caution`, `danger`, `info`, with icon.
- `Drawer` — side sheet with scrim, focus trap, Escape to close, focus returns to the opener. The cart
  uses it in the redesign.

Then replace the app's own copies where they are plain duplicates: buttons in `AddToCart`,
`QuantityStepper`, `CartPage`, `Composer`, `QuickReplies`, `SymptomChips`, `CategoryAisles`;
`OrderStatusBadge` on `Badge`; `SafetyAlert` on `Notice`. Domain components (`ProductCard`,
`ChatProductCard`, …) stay in their features.

### PR 4 — Style guide page and rules

1. `/design` route, dev only: colour swatches with their contrast ratio, the type scale, spacing,
   radii, shadows, motion samples, and every component in each state, in both themes.
2. `packages/design-system/CLAUDE.md` and README: use semantic tokens, never primitives, in app CSS;
   add a token before adding a one-off value; how to add a token (primitive, semantic in both themes,
   contrast check, README row); components take no `className` for restyling.
3. `apps/web/CLAUDE.md`: "Styling: CSS Modules using `@meddash/design-system` tokens; prefer its
   components over new ones; `pnpm verify:web` runs the token check." Root `CLAUDE.md` names the
   package next to the two apps.

## Testing

- Package: unit tests per component and for `check-tokens.mjs`; the theme parity test.
- Web: existing unit and e2e tests keep passing through every PR (they query by role and text, not by
  class, so restyling does not break them). The `readTheme` test changes for the new default.
- Visual check per UI PR: both themes at desktop and phone widths in the browser, screenshots committed.

## Out of scope

- The assistant-first redesign (intro animation, assistant home, top-right nav, care-plan flow): next
  plan, built on this one.
- Self-hosted fonts, a published or versioned package, Figma or native token export, Storybook.

## Open questions

- Should the light theme stay a user choice, or only be used for the Medicines and Checkout views as in
  the canvas (decision 4)?
- Any brand colours or fonts from Redcare that should win over the canvas values?
