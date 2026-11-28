# packages/design-system

The tokens, base styles and core React components for MedDash, shipped as source (no build step;
the app's Vite compiles the TSX). `README.md` has the token
list, how to use it, and how to add a token.

## Definition of done

`pnpm verify:design-system` from the repo root (`tsc`, theme parity and `check-tokens` tests, component
tests in Vitest, token guard).
A change here can restyle the whole app, so also run `pnpm verify:web` and look at `/design` and a few
real pages in both themes.

## Rules

- App and component CSS use semantic tokens (`--color-*` and the theme-independent scales), never
  colour primitives. Primitives live in `tokens.css` and are only read by `themes.css`.
- Add a token before adding a one-off value. Don't silence `check-tokens` with `token-exempt` unless
  the value really is a one-off (a hairline offset, an optical nudge), and say why in the comment.
- Adding a token: primitive in `tokens.css` (in its group, with a heading comment for a new group),
  semantic token in both theme blocks of `themes.css`, a contrast pair on the `/design` page for any
  text or edge colour, and a README row. Both themes must set the same tokens (a test checks).
- Changing a value: check `/design` for contrast in both themes before and after.
- `tokens.css` group headings are one-line comments after a blank line; `/design` reads them, so keep
  that shape.
- Components are built only from tokens, take no `className` for restyling, and get
  tests that query by role. Add a variant rather than letting callers override styles.
- No runtime dependencies (React is a peer). Ask before adding a build step or dev dependency.
- Components live in `src/components/<Name>/` (`.tsx`, `.module.css`, `.test.tsx`) and are exported from
  `src/components/index.ts`. Add each to the gallery on `/design`
  (`apps/web/src/features/design/components/ComponentGallery`).
