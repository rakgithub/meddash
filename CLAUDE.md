# MedDash

pnpm monorepo: `apps/web` (React 18 + Vite + TypeScript) and `apps/server` (Express + zod, port 3001).
Each app has its own conventions: `apps/web/CLAUDE.md` and `apps/server/CLAUDE.md`. Read the one for the app you are changing.

## Commands (run from repo root)

- `pnpm dev` - web (5173) and API (3001) together
- `pnpm verify:web` / `pnpm verify:server` - the definition of done per app; `pnpm verify` runs both

## Rules

- Do not add dependencies without asking.
- Do not edit `pnpm-lock.yaml` by hand; use `pnpm add`.
- Never commit `dist`, `coverage`, `test-results`.
- External skills live in `.agents/skills`, managed by `skills-lock.json`, and `.claude/skills/<name>` symlinks to them. Do not edit those in place.
- Repo-owned skills (for example `.claude/skills/add-endpoint`) are real directories in `.claude/skills`; edit them like any other file.
- For a new or changed API endpoint, use the `add-endpoint` skill.
- When asked to make a plan, save it as Markdown in `docs/plans/<kebab-case-name>.md` (e.g. `docs/plans/phase-1-postgres-products-db.md`), not only in chat. Link the roadmap entry it belongs to, if any.
