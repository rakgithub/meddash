# Plan — Bulk product import with shared images

Status: draft 2026-11-21, awaiting approval of the decisions below.
Roadmap entry: none of its own. It builds on [Phase 2 — Product images](../../PLAN.md#phase-2--product-images),
which added `image_url`.

## Goal

- Load about **5,000 products** into the production database, and re-run the load safely when the data changes.
- Give them images for free: **100 generated images**, each reused by every product of the same kind.
- Host the images on **Vercel Blob**, within the free Hobby limits.

## Why the seed can't do this

- `db:seed` truncates `products` with `CASCADE`, which empties every cart. Orders also point at products.
- `seedGuard.ts` refuses to run with `NODE_ENV=production`, and that guard stays.
- So the import is a separate command that **upserts** and never deletes.

## Vercel Blob Hobby limits (per month)

| Limit                         | Allowance | This plan uses                                            |
| ----------------------------- | --------- | --------------------------------------------------------- |
| Advanced operations (uploads) | 2,000     | ~100 once; only changed images after that                 |
| Storage                       | 1 GB      | ~8 MB (100 × ~80 KB JPEG)                                 |
| Blob data transfer            | 10 GB     | ~125,000 uncached image loads at 80 KB                    |
| Simple operations (reads)     | 10,000    | Browsers cache the images; URLs never change (see step 2) |

Over a limit, Vercel blocks Blob access instead of billing, so every image would stop loading. Unique images for all
5,000 products would need 5,000 uploads, which is why images are shared.

## Decisions to make first

1. **Where the 5,000 products come from.** Not decided yet. The import reads a JSON file; whatever the source is
   (supplier export, spreadsheet, generated demo data) gets converted to that shape first. Every row needs a `sku`,
   because the upsert matches on it.
2. **New dependency: `@vercel/blob`** as a dev dependency of `apps/server`. Only the upload script uses it; the running
   API doesn't. The alternative, calling the Blob REST API with `fetch`, is undocumented as a public contract.
3. **No other new dependencies.**
   - Images are generated with **FLUX.1 schnell via `mflux`**, a Python CLI installed on the Mac
     (`uv tool install mflux`), not a repo dependency. The 4-bit model runs on the M2 Pro (16 GB).
   - PNG → JPEG with macOS `sips` instead of `sharp`. JPEG at quality 75 keeps each image near 80 KB.
   - The import reads JSON, so no CSV parser.
4. **Images have no brand names and no text.** AI gets text wrong, and generic packshots are safe whether the
   products are real or made up.
5. **The import never deletes products** that are missing from the file. Removing products is a separate,
   deliberate step (it touches carts and orders).
6. **Running against a non-local database needs the host typed out:** `--confirm-host <hostname>`. The script
   prints the target host and stops if they don't match. This replaces the seed's blanket refusal, because
   upserting is not destructive.

## How products get an image

Each image has a key: `<category>/<form>`, e.g. `pain-relief/tablet`, `vitamins/capsule`, `skin-care/cream`, plus
one `<category>/default` per category.

- `form` comes from the product's free-text `dosageForm` through a small mapping function: "Film-coated tablet" →
  `tablet`, "Soft capsule" → `capsule`, "Oral solution" → `liquid`, and so on. Unknown forms map to `default`.
- The import gives a product the first image that exists of: `<category>/<form>`, then `<category>/default`.
- If neither exists, `image_url` stays `null` and `ProductCard` shows its placeholder (already built in Phase 2).
- The final list of ~100 keys is made once the product data is known: roughly 15 categories × the 5–6 forms that
  actually occur, plus the defaults.

## Steps

Two PRs. Each leaves the app working. Done when `pnpm verify:server` passes.

### PR 1 — Image pipeline (generate, convert, upload)

Files under `apps/server/catalogue-images/`:

| File            | Committed       | Holds                                                                                                           |
| --------------- | --------------- | --------------------------------------------------------------------------------------------------------------- |
| `prompts.json`  | yes             | key → prompt (`{ "pain-relief/tablet": "white blister pack of round tablets..." }`) and one shared style suffix |
| `out/<key>.jpg` | no (gitignored) | generated, converted images                                                                                     |
| `urls.json`     | yes             | key → `{ hash, url }` after upload; the import reads this                                                       |

1. **`pnpm images:generate`** (`src/db/images/generate.ts`)
   - For each key in `prompts.json` without an `out/` file: run `mflux-generate` (schnell, 4 steps, 4-bit,
     800 × 600, fixed seed per key so re-runs reproduce the image), then `sips` to JPEG quality 75; delete the PNG.
   - Skips existing files, so it can be stopped and resumed. To redo one image, delete its file.
   - Fails clearly when `mflux-generate` or `sips` is missing, and names the install command.
   - Review the 100 images by eye before uploading; delete and regenerate bad ones.
2. **`pnpm images:upload`** (`src/db/images/upload.ts`)
   - Reads `BLOB_READ_WRITE_TOKEN` from the environment, validated with zod; never printed.
   - Hashes each `out/` file (SHA-256, first 8 hex chars). Skips keys whose hash already matches `urls.json`, so
     only changed images use upload operations.
   - Uploads to the stable path `products/<key>-<hash>.jpg` with `addRandomSuffix: false` and a long
     `cacheControlMaxAge` (one year). A changed image gets a new path, so long caching is safe.
   - Uploads 5 at a time, writes `urls.json` after each success, so a failed run keeps what it finished.
   - `--dry-run` lists what would be uploaded without uploading.
3. **Config and docs**
   - `.env.example` documents `BLOB_READ_WRITE_TOKEN` (upload script only; not added to `config/env.ts`, because the
     API never needs it).
   - Add `catalogue-images/out/` to `.gitignore`.
   - Server README: install `mflux`, generate, review, upload.
4. **Tests:** hash and skip logic (which keys need uploading given `urls.json` and the files).
   The Blob client and `mflux` are not called in tests.

### PR 2 — `pnpm db:import <file.json>`

`src/db/import/`:

1. **Input schema** (`importSchema.ts`): one zod object per product, matching `ProductDetail` without `id` and
   `imageUrl`; `sku` required. Price validated as a positive number with at most 2 decimals.
2. **Image key** (`imageKey.ts`): `formFromDosageForm()` and `imageUrlFor(product, urls)`, as described above.
   Plain functions; this is a business rule, so it gets unit tests.
3. **Repo** (`products.repo.ts`): `upsertProductsBySku(rows)`: one `INSERT ... ON CONFLICT (sku) DO UPDATE` per
   batch, returning how many rows were inserted vs updated (`xmax = 0` marks an insert).
   `id` is left to the identity column; `search_vector` is generated, so nothing extra to keep in sync.
4. **CLI** (`importProducts.ts`):
   - Reads the file; validates every row first and prints invalid rows with their index, `sku` and zod message.
     Any invalid row stops the import before anything is written.
   - Duplicate `sku` values in the file are an error.
   - Writes in batches of 500, one transaction per batch, and prints progress. A failed batch stops the run and
     names the first `sku` of that batch; earlier batches stay, and re-running is safe because it upserts.
   - `--dry-run`: validate and report how many would be inserted vs updated; write nothing.
   - `--confirm-host` check from decision 6.
   - Prints a summary: inserted, updated, products without an image.
5. **Scripts:** `db:import` in the server and root `package.json`.
6. **Tests:**
   - `imageKey`: known forms, unknown form → default, missing category → `null`.
   - Input schema: missing `sku`, bad price, duplicate `sku`.
   - Repo against the test DB (like `products.repo.test.ts`): insert, then update the same `sku`; existing cart
     items still point at the product.
   - Host check: local host passes; remote host without or with a wrong `--confirm-host` refuses.

## Running it in production

1. `pnpm images:upload` with the production Blob token (once, then only after image changes).
2. `pnpm db:import products.json --dry-run` against a preview or staging database, then without `--dry-run`.
3. Same against production with `--confirm-host <prod-host>`.

Run it from a developer machine, not in the Vercel build: the build already runs migrations, and a 5,000-row import
on every deploy is slow and needless.

## Out of scope

- Unique images per product (would need Vercel Pro or another store; the image key lookup can later check a
  per-`sku` key first).
- Deleting or archiving products that left the catalogue.
- An admin UI for products (roadmap Phase 8).
