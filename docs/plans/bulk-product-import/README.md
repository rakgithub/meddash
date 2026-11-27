# Plan — A 1,000-product catalogue

Status: in progress 2026-11-26. This is a demo, so the catalogue is 1,000 products, not 5,000; PR 1 is built.
Roadmap entry: none of its own. It builds on [Phase 2 — Product images](../../PLAN.md#phase-2--product-images)
(images are Unsplash CDN URLs, as the seed already uses).

## Goal

- Production holds about **1,000 products** across **12 categories** and about **40 brands**, so search, filters,
  facets, paging and the assistant behave like a real shop.
- Every product has a **matching image**: an ibuprofen tablet shows tablets, a nasal spray shows a spray, a sunscreen
  shows sunscreen. Images repeat across similar products; about a dozen distinct photos in total (demo).
- The load can be re-run: it updates the same products instead of adding duplicates, and never deletes.

Out of scope: Vercel Blob, generated (AI) images, real supplier data, deleting products.

## Where the data comes from

There is no real catalogue to import, so a **deterministic generator** builds it from hand-written tables:

| Table         | Size | Example                                                                                                                                                                          |
| ------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Categories    | 12   | the existing `pain-relief`, `cold-flu`, `skin-care`, `vitamins`, plus `allergy`, `digestion`, `first-aid`, `eye-ear`, `oral-care`, `sleep-stress`, `baby-child`, `womens-health` |
| Product types | ~60 | "Ibuprofen": strengths 200 / 400 mg; forms tablet, capsule, gel; packs 10 / 20 / 50; base price; usage and warning text; image key                                               |
| Brands        | ~40  | name, manufacturer, price tier (budget / standard / premium)                                                                                                                     |

The generator expands each type into its strength × form × pack combinations, gives each combination 2–5 brands
picked with a seeded random generator, and stops at 1,000. Same tables in → same 1,000 products out.

Each product gets:

- **Name:** `{brand} {ingredient} {strength} {form}`, e.g. "Medilo Ibuprofen 400 mg film-coated tablets".
- **SKU:** built from the combination, e.g. `MD-IBU-400-TAB-20-MEDI`. Stable even when tables grow, so a re-run
  updates the same rows. The 12 seed products (`MD-0001`…) are untouched.
- **Price:** type base price × pack size factor × brand tier, rounded to a `.49` / `.99` ending.
- **Description, usage instructions, warnings:** from the type, with a few phrasing variants.
- **Stock:** 0–300, about 5% out of stock. **Prescription-only:** set per type (a few types only).
- **Image URL:** see below.

## How images are matched

`catalogue/images.ts` maps **image keys** to 1–3 Unsplash photo ids, the same URL format the seed uses
(`images.unsplash.com/photo-<id>?w=600&h=450&fit=crop&q=75`). Unsplash's licence allows free use, and no API key is
needed because we only link to the CDN.

- Keys go from specific to general: `ibuprofen-tablet` → `pain-relief/tablet` → `pain-relief`.
- A product takes the most specific key that has photos; with several photos, the SKU picks one, so neighbours in a
  result list don't all show the same picture.
- Photos are chosen by hand on unsplash.com by searching for the product kind ("blister pack tablets", "nasal spray",
  "sunscreen tube", "vitamin capsules"). I can do the searching in the browser and propose the list for review.
- `pnpm catalogue:check-images` requests every URL once and lists dead ones. Run by hand, not in CI (network).

## Decisions to make first

1. **Fictional brands.** Brand names like "Medilo" or "Vitara" instead of real ones (Nurofen, Ratiopharm). Pairing
   real brands with products they don't make looks real but misrepresents them. The 12 seed products keep their real
   brands.
2. **PZN stays empty** (`null`) for generated products. Made-up numbers would look like real PZNs and could match
   real medicines.
3. **Accurate medical text.** Usage and warnings are written once per product type from standard over-the-counter
   label wording, not made up per product. The assistant recommends these products in production, so this matters.
4. **No new dependencies.** The seeded random generator is ~10 lines; validation reuses the zod product schema.
5. **The loader never deletes**, and against a non-local database it runs only with `--confirm-host <hostname>`
   matching the target. `db:seed` and its production guard stay as they are; CI and tests keep using the 12 seed
   products.

## Steps

Two PRs. Load production only after both are merged. Each done when its `pnpm verify:*` passes.

### PR 1 — Generator and loader (server)

In `apps/server/src/db/catalogue/`:

1. **Tables:** `categories.ts`, `productTypes.ts`, `brands.ts`, `images.ts`.
2. **Generator** (`generate.ts`): `generateCatalogue(target = 1000)` returns products; plain functions for SKU,
   price and image lookup.
3. **Repo** (`products.repo.ts`): `upsertProductsBySku(rows)`: `INSERT ... ON CONFLICT (sku) DO UPDATE`, returning
   inserted vs updated counts.
4. **CLI** (`load.ts`), `pnpm db:catalogue` (server and root `package.json`):
   - Generates, validates every product with the zod schema, and stops before writing if any fail.
   - Writes in batches of 500, one transaction per batch; prints progress and a summary per category.
   - `--dry-run` writes nothing and reports how many would be inserted vs updated.
   - `--confirm-host` check from decision 5.
5. **`catalogue:check-images`** script.
6. **Tests:**
   - Generator: 1,000 products; SKUs unique; same output on two runs; every product passes the schema; every
     product has an image URL; every image key used resolves to a photo; every category has products.
   - SKU stability: adding a product type doesn't change existing SKUs.
   - Price: tiers and pack sizes order prices as expected; always positive, two decimals.
   - Repo against the test DB: insert, then update the same SKU; existing cart items still point at it.
   - Host check: local passes; remote without or with a wrong `--confirm-host` refuses.

### PR 2 — Web handles 12 categories and many brands

1. `filterOptions.ts`: add the 8 categories to `CATEGORIES` and their words to `CATEGORY_KEYWORDS`.
2. `CategoryAisles`: an icon per new category (inline SVG like the existing ones). The row already scrolls on narrow
   screens.
3. `formatCategory`: labels for slugs that don't read well ("Eye and ear", "Sleep and stress", "Women's health",
   "Baby and child").
4. **Brand filter from the API:** `RefinePanel` reads brands from `GET /api/facets` (already fetched by
   `fetchFacets`) instead of the hard-coded `BRANDS`, so 40 brands don't need a code change. Remove `BRANDS`.
5. Tests for the new categories and the brand list; desktop and mobile screenshots of the aisles and refine panel in
   the PR.

## Loading production

1. Run the loader locally first: `pnpm db:seed`, then `pnpm db:catalogue`. Click through search, filters, paging,
   a few detail pages and the assistant.
2. `pnpm catalogue:check-images`; replace any dead photo ids.
3. Production, from a developer machine with the production `DATABASE_URL`:
   `pnpm db:catalogue --dry-run`, then `pnpm db:catalogue --confirm-host <prod-host>`.
4. Re-run `pnpm assistant:eval` and check the assistant still picks sensible products from the larger catalogue.

Not in the Vercel build: the build already runs migrations, and loading 1,000 rows on every deploy is needless.
