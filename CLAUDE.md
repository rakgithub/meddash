# MedDash

pnpm monorepo: `apps/web` (React + Vite + TypeScript), `apps/server` (Express + zod, port 3001) and
`packages/design-system` (`@meddash/design-system`: the tokens and base styles the web app uses).
Each has its own conventions: `apps/web/CLAUDE.md`, `apps/server/CLAUDE.md` and
`packages/design-system/CLAUDE.md`. Read the one for the part you are changing.

## Commands (run from repo root)

- `pnpm dev` - web (5173) and API (3001) together
- `pnpm verify:design-system` / `pnpm verify:web` / `pnpm verify:server` - the definition of done per part; `pnpm verify` runs all three

## Rules

- Do not add dependencies without asking.
- Do not edit `pnpm-lock.yaml` by hand; use `pnpm add`.
- Never commit `dist`, `coverage`, `test-results`.
- External skills live in `.agents/skills`, managed by `skills-lock.json`, and `.claude/skills/<name>` symlinks to them. Do not edit those in place.
- Repo-owned skills (for example `.claude/skills/add-endpoint`) are real directories in `.claude/skills`; edit them like any other file.
- For a new or changed API endpoint, use the `add-endpoint` skill.
- When asked to make a plan, save it as Markdown, not only in chat. Link the roadmap entry it belongs to, if any, and add a row to the index in `docs/plans/README.md`.
  - A new piece of work gets a folder: `docs/plans/<kebab-case-name>/README.md` (e.g. `docs/plans/postgres-products-db/README.md`).
  - A detailed plan for one PR of it goes next to it: `docs/plans/<name>/pr-<n>-<kebab-case-name>.md`.
