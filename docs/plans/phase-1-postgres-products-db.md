# Phase 1 plan — Postgres in Docker, products from the DB

Status: approved 2026-11-19 (all four decisions as proposed); implemented. Deviation: Postgres is published on host port 5433, not 5432, to avoid clashing with a local Postgres. Roadmap entry: [`docs/PLAN.md`](../PLAN.md#phase-1--postgres-in-docker-products-from-the-db).

One PR, ordered so the app keeps working after each step. Done when `pnpm verify` passes locally with the DB running.

## Decisions to make first

1. **New dependencies need approval:** `drizzle-orm` and `pg`, plus dev dependencies `drizzle-kit` and `@types/pg`.
   No `dotenv`: Node 22's built-in `--env-file-if-exists` (used through `tsx` and `node`) does the same job.
2. **Product `id` is an integer in the DB but stays a string in the API.** Search ranking breaks ties by
   "catalogue order", and `suggest.routes.test.ts` expects ids `9, 10` in that order. Text ids would sort
   `1, 10, 11, 2`. The seed inserts the existing ids explicitly and then resets the id sequence. The row mapper
   returns `String(id)`.
3. **The roadmap contradicts itself on the catalogue.** It says to seed from `data/products.ts` and also to delete
   that file. Fix: move it to `src/db/seed-data.ts`. It becomes seed data only; nothing reads it at runtime.
4. **Express 4 doesn't pass errors from async handlers to the error handler.** Once services are async, a DB error
   would become an unhandled rejection and `errorHandler` would never see it. Fix: a ~5-line `asyncHandler` wrapper
   in `middleware/`. Alternative: upgrade to Express 5, which is a bigger change.

## Steps

### 1. Infrastructure

- `docker-compose.yml` at the repo root:
  - Image `postgres:16`, a named volume, a `pg_isready` healthcheck, port 5432.
  - An init script that also creates a separate `meddash_test` database.
- `apps/server/.env.example` with `DATABASE_URL`; add `.env` to `.gitignore` (it isn't there now).
- Root `package.json` scripts for `docker compose`: `db:up`, `db:down`.

### 2. Config

- Rewrite `config/env.ts` to validate `PORT` and `DATABASE_URL` with zod at startup.
- Fail fast with a readable message that never prints the URL, since it contains the password.

### 3. DB module

- `src/db/client.ts`: one `pg.Pool` and the Drizzle client.
- `src/db/schema.ts`: the `products` table:
  - `id` integer identity, `name`, `description`, `category`, `brand`.
  - `price` as `numeric(10,2)`. `pg` returns numeric values as strings, so the mapper converts them explicitly.
- Indexes that match the actual queries:

  | Index                          | Used by               |
  | ------------------------------ | --------------------- |
  | `lower(category)`              | exact category filter |
  | `lower(brand)`                 | exact brand filter    |
  | `price`                        | price range filter    |
  | `lower(name) text_pattern_ops` | `LIKE 'ibu%'` suggest |

- `index.ts` closes the pool on SIGTERM/SIGINT.

### 4. Migrations and seed

- `drizzle.config.ts`, then `drizzle-kit generate`; commit the SQL under `apps/server/drizzle/`.
- `db:migrate` runs Drizzle's migrator through a small script. `db:seed` truncates the table and inserts
  `seed-data.ts`, so it can be re-run safely.
- Add both commands to the server and root `package.json`.

### 5. Data access

- `src/db/products.repo.ts` with small functions:

  | Function                            | Returns                   |
  | ----------------------------------- | ------------------------- |
  | `findProducts(filters, sort, page)` | `{ rows, total }`         |
  | `findSuggestions(prefix, limit)`    | matching names and brands |
  | `listAllProducts()`                 | every product             |

- **Search**: each term becomes an `ILIKE` across name, brand and description. Every term must match.
  - Relevance score: `SUM(CASE WHEN name ILIKE … THEN 2 ELSE 1 END)`; ties ordered by `id`.
  - `total` comes from a separate `count(*)`. `count(*) over()` would lose the total when the page is past the
    last result.
- **Suggest**: name prefix matches first, then brand-only matches, `LIMIT 5`.
- `%`, `_` and `\` in user input are escaped before going into `LIKE`. Values are always parameters, never
  concatenated into SQL.

### 6. Mapping

- `toProduct(row)` builds the API shape field by field, so DB columns never leak into responses.
- Zod schemas, OpenAPI and web types stay unchanged. No contract change.

### 7. Services and controllers

- Services become async and take the repo function as a parameter with a default, following the existing
  `source = catalogue` pattern, so unit tests can inject a fake.
- Pure logic stays in plain functions with unit tests: splitting terms, escaping `LIKE`, pagination math, mapping.
- Controllers use `asyncHandler`.

### 8. Tests and CI

- Vitest `globalSetup` migrates and seeds `meddash_test` once. Tests only read, so they share the seed.
- Existing route tests run unchanged against the real DB — the regression check that the SQL matches the old
  in-memory behaviour.
- One test showing a DB failure returns a 500 through `errorHandler`.
- Exclude `migrate.ts` and `seed.ts` from coverage, like `index.ts`, because they are entry points.
- `server-ci.yml`: `postgres:16` service container and `DATABASE_URL`.
- **Not in the roadmap:** `web-ci.yml` also needs Postgres plus migrate and seed, because Playwright starts the real
  API for e2e tests.

### 9. Cleanup and docs

- Delete `data/products.ts`, `types/product.ts` (infer the type from `productSchema`) and the "in-memory mock"
  comments.
- README setup order: `docker compose up -d`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`.
- Tick the Phase 1 boxes in `docs/PLAN.md` when it lands on `main`.

## Risks

- **Name sorting may differ.** `localeCompare` and Postgres collation can order names differently. The existing
  `name_asc` / `name_desc` tests will catch it; if they differ, pin the collation in SQL rather than change the tests.
- **Relevance ordering is the easiest thing to get subtly wrong.** Add a multi-term route test where the score
  decides the order before switching the service over.
