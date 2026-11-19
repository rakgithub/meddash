# MedDash

MedDash is an online pharmacy: browse and search medicines, vitamins, cold and flu remedies and skin care. A React frontend and an Express API in a pnpm monorepo.

| App                          | Stack                           | Port |
| ---------------------------- | ------------------------------- | ---- |
| [`apps/web`](apps/web)       | React 18, Vite, TypeScript      | 5173 |
| [`apps/server`](apps/server) | Express, zod, OpenAPI (Swagger) | 3001 |

## Getting started

Requires Node.js and [pnpm](https://pnpm.io) (version pinned in `package.json`).

```bash
pnpm install
pnpm dev
```

Open <http://localhost:5173>. Vite proxies `/api/*` to the server on `:3001`.

## Features

- Find medicines by name, category, brand and price range; sort and paginate results.
- **Autocomplete** on the Name field: suggestions as you type, driven by `GET /search/suggest`.
  - Debounced (250 ms, minimum 2 characters); a new keystroke cancels the previous request, so stale responses never overwrite newer ones.
  - Accessible combobox: Up/Down arrows (wrapping), Enter to pick, Escape to close, `aria-activedescendant`, and a live status for result count, empty and error states.

![Autocomplete on desktop](docs/screenshots/autocomplete-desktop.png)

## API

Interactive docs: <http://localhost:3001/docs> (raw spec at `/openapi.json`).

| Endpoint              | Description                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ |
| `GET /products`       | Every product in the catalogue                                                       |
| `GET /search`         | Search with `q`, `category`, `brand`, `minPrice`, `maxPrice`, `sort`, `page`         |
| `GET /search/suggest` | Up to 5 products whose name or brand starts with `q` (case-insensitive, names first) |

Invalid input returns `400` with `{ error: { message, details } }`. Set `PORT` to change the server port.

## Scripts

Run from the repo root.

| Command              | What it does                                         |
| -------------------- | ---------------------------------------------------- |
| `pnpm dev`           | Web and API together                                 |
| `pnpm dev:web`       | Web only                                             |
| `pnpm dev:server`    | API only                                             |
| `pnpm test`          | Unit tests in both apps                              |
| `pnpm test:e2e`      | Playwright e2e against the real API and Vite server  |
| `pnpm build`         | Production build of both apps                        |
| `pnpm verify:server` | Lint, format, types, tests with coverage, build      |
| `pnpm verify:web`    | Lint, format, types, tests with coverage, build, e2e |
| `pnpm verify`        | Both of the above                                    |

`verify:*` is the definition of done for each app and is what CI runs.

## Project layout

```
apps/
  web/      features/<feature>/{components,hooks,api,utils}, shared code in src/lib
  server/   routes -> controllers -> services, with zod schemas and OpenAPI in schemas/ and openapi/
```

Zod schemas in `apps/server/src/schemas` are the source of truth for request and response shapes; the web app mirrors them in `types.ts`.

## Contributing

Per-app conventions live in [`apps/web/CLAUDE.md`](apps/web/CLAUDE.md) and [`apps/server/CLAUDE.md`](apps/server/CLAUDE.md). In short: no new dependencies without discussion, and don't commit `dist`, `coverage` or `test-results`.
