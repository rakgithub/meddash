# MedDash

MedDash is an online pharmacy: browse and search medicines, vitamins, cold and flu remedies and skin care. A React frontend and an Express API in a pnpm monorepo.

| App                          | Stack                           | Port |
| ---------------------------- | ------------------------------- | ---- |
| [`apps/web`](apps/web)       | React 18, Vite, TypeScript      | 5173 |
| [`apps/server`](apps/server) | Express, zod, OpenAPI (Swagger) | 3001 |

## Getting started

Requires Node.js 22+, [pnpm](https://pnpm.io) (version pinned in `package.json`) and Docker.

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
docker compose up -d   # or: pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Postgres 16 runs in Docker on host port **5433** (so it doesn't clash with a local Postgres on 5432). It holds two databases: `meddash` for development and `meddash_test`, which the server tests migrate and seed themselves. `pnpm db:seed` replaces all products with the seed catalogue (it refuses to run in production or against a non-local database); `pnpm db:down` stops the container and keeps the data volume.

Open <http://localhost:5173>. Vite proxies `/api/*` to the server on `:3001`.

## Features

- Find medicines by name, category, brand and price range; sort and paginate results.
- **Autocomplete** on the Name field: suggestions as you type, driven by `GET /search/suggest`.
  - Debounced (250 ms, minimum 2 characters); a new keystroke cancels the previous request, so stale responses never overwrite newer ones.
  - Accessible combobox: Up/Down arrows (wrapping), Enter to pick, Escape to close, `aria-activedescendant`, and a live status for result count, empty and error states.

![Autocomplete on desktop](docs/screenshots/search-autocomplete/desktop.png)

## API

Interactive docs: <http://localhost:3001/docs> (raw spec at `/openapi.json`).

| Endpoint              | Description                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ |
| `GET /products`       | Every product in the catalogue                                                       |
| `GET /products/:id`   | One product with every detail field (404 if unknown, 400 for a malformed id)         |
| `GET /search`         | Search with `q`, `category`, `brand`, `minPrice`, `maxPrice`, `sort`, `page`         |
| `GET /search/suggest` | Up to 5 products whose name or brand starts with `q` (case-insensitive, names first) |
| `POST /auth/register` | Create an account (`email`, `password` min 8, `name`) and sign in; 409 if the email exists |
| `POST /auth/login`    | Sign in; 401 `Invalid email or password` for either a wrong email or wrong password   |
| `POST /auth/logout`   | Clear the session cookie (204)                                                       |
| `GET /auth/me`        | The signed-in user; 401 without a valid session                                      |

Invalid input returns `400` with `{ error: { message, details } }`. The server reads `PORT`, `DATABASE_URL` (required), `JWT_SECRET` (required, at least 32 characters, e.g. `openssl rand -hex 32`) and `NODE_ENV` from the environment or `apps/server/.env`, and exits with a readable message if any is invalid.

Authentication is a JWT (HS256, 7 days) in an `httpOnly`, `SameSite=Lax` cookie named `session`, marked `Secure` when `NODE_ENV=production`. Passwords are hashed with Node's built-in scrypt. Logging out clears the cookie; the token itself stays valid until it expires.

## Scripts

Run from the repo root.

| Command              | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `pnpm dev`           | Web and API together                                 |
| `pnpm dev:web`       | Web only                                             |
| `pnpm dev:server`    | API only                                             |
| `pnpm db:up`         | Start Postgres in Docker and wait until healthy      |
| `pnpm db:down`       | Stop Postgres (data volume is kept)                  |
| `pnpm db:migrate`    | Apply migrations from `apps/server/drizzle`          |
| `pnpm db:seed`       | Replace the products table with the seed catalogue   |
| `pnpm test`          | Unit tests in both apps                              |
| `pnpm test:e2e`      | Playwright e2e against the real API and Vite server  |
| `pnpm build`         | Production build of both apps                        |
| `pnpm verify:server` | Lint, format, types, tests with coverage, build      |
| `pnpm verify:web`    | Lint, format, types, tests with coverage, build, e2e |
| `pnpm verify`        | Both of the above                                    |

`verify:*` is the definition of done for each app and is what CI runs. Both need Postgres running; `verify:web` also needs the dev database migrated and seeded, because e2e tests start the real API.

## Project layout

```
apps/
  web/      features/<feature>/{components,hooks,api,utils}, shared code in src/lib
  server/   routes -> controllers -> services -> db (Drizzle + Postgres), with zod schemas and OpenAPI in schemas/ and openapi/
```

Zod schemas in `apps/server/src/schemas` are the source of truth for request and response shapes; the web app mirrors them in `types.ts`.

## How we work with Claude

The repo ships its own Claude Code setup: conventions in `CLAUDE.md`, command permissions and a format-on-edit hook in `.claude/settings.json`, dev servers in `.claude/launch.json`, and skills in `.claude/skills`. For each task:

1. Pick a phase or task from [`docs/PLAN.md`](docs/PLAN.md) and create a branch.
2. For a big phase (database, auth, orders, payment), start in plan mode and approve the plan before any code is written.
3. Implement until `pnpm verify` passes. For a new or changed API endpoint, use the `/add-endpoint` skill.
4. Run `/code-review high`, plus `/security-review` for auth, cart, payment and security work.
5. Open the PR, fill in the template, and tick the boxes in `docs/PLAN.md`.

When Claude gets something wrong, the fix PR also adds what would have prevented it: a line in the relevant `CLAUDE.md`, a lint rule, a test or a hook.

## Contributing

Per-app conventions live in [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) and [`apps/server/CLAUDE.md`](apps/server/CLAUDE.md). In short: no new dependencies without discussion, and don't commit `dist`, `coverage` or `test-results`.
