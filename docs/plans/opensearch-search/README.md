# Plan — OpenSearch search platform

Status: draft 2026-11-28, revised the same day for free-tier hosting; awaiting approval of the decisions below.
Roadmap entry: [Track — Search platform (OpenSearch)](../../PLAN.md#track--search-platform-opensearch).
Builds on: [Postgres products DB](../postgres-products-db/README.md), [1,000-product catalogue](../bulk-product-import/README.md),
[Symptom assistant backend](../symptom-assistant-backend/README.md) (the `search_products` tool).

## Goal

Move product search to a dedicated search engine, the way enterprise e-commerce runs catalogue search:

- **Postgres stays the source of truth** for products, stock, orders and users.
- **OpenSearch serves search:** the search bar, filters with counts, suggestions and the assistant's `search_products` tool.
- **Hybrid search:** BM25 keyword relevance plus vector search by meaning, so "something for a tickly cough at night"
  finds a dry-cough syrup that never uses those words.
- **Reliable sync** from Postgres to the index (transactional outbox), **zero-downtime reindexing** (index aliases)
  and a **Postgres fallback** if OpenSearch is down.
- **Measured, not assumed:** a relevance eval set with recall and MRR before and after, plus latency and
  zero-result tracking.
- **$0 to run:** a hobby demo, so every hosted piece uses a free tier (see the cost constraint below).

The LLM never queries OpenSearch directly. Claude keeps calling `search_products({ query, category })`; the server
decides how to search and what Claude may see.

## Current state

| Path                       | Code today                                                   | Used by                |
| -------------------------- | ------------------------------------------------------------ | ---------------------- |
| Search + sort + pagination | `findProducts` (`ILIKE` per term, relevance score)           | `GET /api/search`      |
| Facets                     | `findFacetData` (group by category, brand; prices)           | `GET /api/facets`      |
| Suggestions                | `findSuggestions` (name/brand prefix)                        | `GET /api/suggest`     |
| Assistant search           | `searchCatalogue` (`tsvector` + `ts_rank`, `ILIKE` fallback) | `search_products` tool |

Products are written in three places: `db/seed.ts`, `upsertProductsBySku` in `db/catalogue/catalogue.repo.ts`
(the catalogue import) and stock changes in `db/orders.repo.ts`. Every one of them must feed the index.

The API runs on Vercel serverless functions (`fra1`), so there is no always-on worker process.

## Cost constraint: everything on free tiers

MedDash is a hobby demo, so every piece must run at $0. This rules out anything that needs a paid plan, and it
shapes decisions 3–5 below.

| Piece          | Free option                       | Limit that matters here                                              |
| -------------- | --------------------------------- | -------------------------------------------------------------------- |
| API            | Vercel Hobby                      | Non-commercial use only; cron once a day                             |
| OpenSearch     | Aiven free plan                   | Single node, 4 GB RAM, 20 GB disk; powers off after 24 h with no use |
| Embeddings     | Voyage AI free tokens             | One-time 200M tokens; 1,000 products use a tiny fraction             |
| Outbox retries | Upstash QStash free tier          | Daily message cap (1,000/day at last check), so not every minute     |
| Local and CI   | Docker, GitHub Actions containers | None                                                                 |

Limits checked 2026-11-28; check the providers' pricing pages again before PR 6.

## Decisions to make first

1. **New dependency (needs approval):** `@opensearch-project/opensearch`, the official Node client. No other
   runtime dependency: the embedding API is called with `fetch` (decision 3).
2. **Engine: OpenSearch, not Elasticsearch.** Apache 2.0 with vector search, hybrid queries and hosted ML
   models all free; AWS-managed option. The search design would be the same on Elasticsearch.
3. **The app creates embeddings, not OpenSearch.** `search/embeddings.ts` calls the Voyage AI API (free tokens)
   with `fetch` and sends vectors to OpenSearch: one call per product batch when indexing, one per query when
   searching. Free OpenSearch hosts don't run models, and their support for ML Commons connectors isn't
   documented, so plain `knn_vector` fields work on any host.
   - **Without `VOYAGE_API_KEY`** (local by default, CI): no embeddings, search is BM25 only, same as before PR 4.
   - **Tests** use a small deterministic fake embedder, so CI needs no key and no network.

   Rejected: ML Commons in OpenSearch (needs a model on the node or a connector the free host may not allow).

4. **Hosting: Aiven free plan.** Free with no expiry, k-NN included, more room than needed for 1,000 products.
   It powers off after 24 hours with no indexing or queries; the outbox schedule (decision 5) runs a cheap
   query each time, which keeps it on. If it is off anyway, search falls back to Postgres.
   Check before PR 4 that the free plan allows the `hybrid` query and search pipelines (neural-search plugin);
   if not, run the BM25 and `knn` queries separately and combine scores in the app.
   Backup option: Bonsai's free sandbox (OpenSearch 3.x, `us-east-1` only; vector search on it not confirmed).
   AWS OpenSearch Service is described in the runbook only as the paid upgrade path.
5. **Sync trigger on Vercel:** Vercel Hobby cron runs only once a day, so:
   - write the outbox row in the same transaction as the product change,
   - try to index straight after commit (best effort),
   - an Upstash QStash schedule (free tier) calls the outbox processor **every 5 minutes** for retries
     (288 calls a day, well under the free daily cap; every minute would be 1,440 and could exceed it).

   Rejected: Vercel Pro cron (paid).

6. **Response shapes stay the same.** `/api/search`, `/api/facets`, `/api/suggest` and the `search_products` tool
   keep their zod schemas and OpenAPI entries. Only the ranking can change, which the evals measure.

## Architecture

```
            writes                                         reads
 seed / catalogue import / orders                 search bar, facets, suggest, assistant tool
              │                                                    │
              ▼                                                    ▼
   ┌──────────────────────┐                          ┌──────────────────────────┐
   │ Postgres             │                          │ search.backend.ts        │
   │ products + outbox    │  (same transaction)      │ OpenSearch first,        │
   └─────────┬────────────┘                          │ Postgres fallback        │
             │ outbox rows                           └────────────┬─────────────┘
             ▼                                                    │
   ┌──────────────────────┐   bulk upsert/delete     ┌────────────▼─────────────┐
   │ Outbox processor     │ ───────────────────────► │ OpenSearch               │
   │ (after commit + cron)│                          │ alias `products` →       │
   └──────────────────────┘                          │ `products_v<n>`, hybrid  │
                                                     └──────────────────────────┘
```

## Where the code runs

OpenSearch is a separate service (a Docker container locally, Aiven in production), like Postgres. Our search
code is not: it lives in `apps/server/src/search/` and deploys with the API. No new app in the monorepo.

- Nothing needs to run on its own: the outbox processor is an API endpoint and the reindex is a script.
- Search needs the server's Postgres repos (fallback, outbox in the same transaction) and zod schemas.
- One deploy and one set of env vars, on Vercel Hobby.

The rest of the server reaches search only through `search.backend.ts`, and the outbox processor runs on its
own via its endpoint, so splitting later means moving files, not a redesign. Split when one of these happens:

- **Indexer worker (`apps/search-indexer`), usually first:** the outbox can't keep up within a serverless call
  (large imports, live price/stock feeds), reindexing slows the API, or sync moves to a queue or CDC consumer
  that must run all the time.
- **Search API (`apps/search-api`), later:** several clients need search directly, search traffic needs its own
  scaling, or a separate team owns ranking and releases.

## PRs

Each PR leaves the app working and is done when `pnpm verify` passes. Until PR 3 lands, nothing reads from
OpenSearch, so the first two PRs can't break search.

### PR 1 — OpenSearch locally, client and index

- `docker-compose.yml`: an `opensearch` service (`opensearchproject/opensearch`, pinned version), single node,
  security plugin on with a local password, healthcheck, named volume, about 1 GB heap. OpenSearch Dashboards
  as an optional profile.
- `config/env.ts`: `OPENSEARCH_URL`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD`, validated with zod.
  Optional, like `ANTHROPIC_API_KEY`: without them the app keeps using Postgres. Never log them.
- `search/client.ts`: one client with keep-alive and a short request timeout (about 800 ms).
- `search/productIndex.ts`: the index mapping, kept next to a `toSearchDocument(row)` mapper:
  - `name`, `brand`, `activeIngredients` as `text` with English and German analyzers, plus `keyword` subfields.
  - `name.suggest` as `search_as_you_type` for suggestions.
  - `category`, `brand.keyword`, `dosageForm`, `requiresPrescription`, `inStock` for filters and facets.
  - `price` as `scaled_float`.
  - `embedding` as `knn_vector` (HNSW, cosine), filled by the app from PR 4 on.
  - A synonym filter from `search/synonyms.ts` (for example paracetamol ⇄ acetaminophen, cold ⇄ flu,
    painkiller ⇄ analgesic). Synonyms are applied at search time so they can change without a reindex.
- `pnpm search:reindex`: builds `products_v<n+1>` from Postgres in bulk batches, checks the document count, then
  switches the `products` alias in one atomic call and deletes old versions beyond the last two.
  The same script creates the index on first run.
- CI: an OpenSearch service container in `server-ci.yml`.
- Tests: mapper unit tests; reindex integration test against the container (count matches, alias moves).

### PR 2 — Sync with a transactional outbox

- Migration: `search_outbox` (`id`, `product_id`, `op` upsert/delete, `attempts`, `last_error`, `created_at`,
  `processed_at`). Never edit an applied migration; this is a new one.
- Every product write adds an outbox row **in the same transaction**: `db/seed.ts`, `upsertProductsBySku`, and
  the stock update in `orders.repo.ts`. A write without its outbox row can't commit, so the index can't silently
  miss a change.
- `search/outboxProcessor.ts`:
  - Claims a batch with `FOR UPDATE SKIP LOCKED`, so two runs never process the same rows.
  - Loads the current product rows, sends one `_bulk` request, marks the rows processed.
  - Safe to repeat: documents use the product id as `_id`, so a retry overwrites with the latest data.
  - After 5 failed attempts a row stops retrying and is logged as stuck (counts only, no product text).
- `POST /internal/search/outbox`: runs one batch. Protected by a shared secret header, not by user auth.
  Registered in OpenAPI as internal.
- After commit, the write path calls the processor once (best effort, never fails the user's request).
- Tests: outbox row written with each product write, rolled back with it; processor retries and gives up
  after 5 attempts; concurrent runs don't double-process.

### PR 3 — Search, facets and suggestions on OpenSearch, with fallback

- `search/search.backend.ts`: the one place that decides OpenSearch or Postgres.
  - OpenSearch when configured; on error or timeout, the existing Postgres query for that request.
  - A small circuit breaker: after a few failures in a row, skip OpenSearch for 30 seconds.
  - A log line per fallback (no query text, which can be health data).
- Search: `multi_match` over name (boost 3), active ingredients (boost 3), brand (2), description (1), with
  `fuzziness: AUTO` for typos ("ibuprofin"). Sorting and pagination as today; ties broken by id.
- Facets: one request with `terms` aggregations for category and brand and a `stats`/`histogram` for price.
  Each facet ignores its own filter (post-filter and filtered aggregations), matching `findFacetData` today.
- Suggestions: a `search_as_you_type` query on `name.suggest`.
- Services and controllers don't change; they keep taking their data source as a parameter.
- Tests: the existing route tests run against both backends. A parity test checks the same filters give the
  same totals and facet counts in OpenSearch and Postgres.

### PR 4 — Hybrid search and the assistant tool

- `search/embeddings.ts`: embeds the text built from name, active ingredients, category and what the product is
  for (description) through the Voyage API, in batches. `toSearchDocument` adds the vector when a key is set; the
  outbox processor and `pnpm search:reindex` both go through it. Reindex once to fill existing documents.
- Query time: embed the search text (one API call, same timeout and fallback rules as OpenSearch: if it fails,
  run BM25 only).
- Search pipeline `products-hybrid`: min-max normalisation, then a weighted combination of BM25 and vector
  scores (start at 0.6 BM25 / 0.4 vector; tuned in PR 5).
- `searchCatalogue` (the `search_products` tool) uses a `hybrid` query: BM25 `multi_match` plus a `knn` query,
  filtered by category when given, limit 8. Same `CatalogueItem` shape, so Claude and the prompt don't change.
  The server still records the returned ids, so `recommend_products` accepts only those.
- The search bar stays on BM25 at first; hybrid there is a switch flipped after PR 5 shows it helps.
- `config/env.ts`: optional `VOYAGE_API_KEY`. Never logged.
- Tests: query building unit tests with the fake embedder; embedding failure falls back to BM25. The "tickly
  cough at night returns a cough product" check runs in `pnpm eval:search` with a real key, not in CI.

### PR 5 — Relevance evals and observability

- `apps/server/evals/search/`: about 50 hand-labelled queries with expected product ids, covering exact names,
  ingredients, symptoms in plain words, typos, German words and synonyms.
- `pnpm eval:search` reports recall@8 and MRR for Postgres, OpenSearch BM25 and hybrid, side by side.
  The numbers go into this plan and the PR description.
- Use the results to set the BM25/vector weights and decide whether the search bar uses hybrid.
- Logging per search: backend used, latency, result count, whether it fell back. A zero-result counter, so
  missing synonyms show up. No query text in logs.
- Add search cases to the assistant evals so a tool regression is caught too.

### PR 6 — Deployment and runbook

- Create the Aiven free OpenSearch service (decision 4) and write down the steps in the runbook so it can be
  recreated. Index setup itself is code (`pnpm search:reindex`).
- Vercel env vars for OpenSearch, `VOYAGE_API_KEY` and the outbox secret; QStash schedule every 5 minutes for
  the outbox processor (decision 5).
- Run `pnpm search:reindex` against production once; after that the outbox keeps it in sync.
- `docs/runbooks/search.md`: reindexing, rotating credentials, what happens when OpenSearch is down (fallback),
  clearing stuck outbox rows, powering the Aiven service back on, and the paid upgrade path (AWS OpenSearch
  Service, Vercel Pro) if the app ever stops being a hobby project.
- README: `docker compose up -d`, `pnpm search:reindex`, how to run without OpenSearch.

## Out of scope

- Merchandising rules (pinned or boosted products), personalisation, learning to rank from clicks.
- Search analytics dashboards beyond the log lines and zero-result counter.
- Indexing anything other than products (orders, users).

## Risks

- **Ranking changes users notice.** Existing route tests assert today's order. Where OpenSearch ranks
  differently, update the expectation in the PR and justify it with the eval numbers.
- **Free tiers change.** Any provider can cut its free plan. Every piece is optional: without OpenSearch,
  search runs on Postgres; without Voyage, it runs BM25 only.
- **Aiven idle power-off.** If the service powers off anyway, search falls back to Postgres until it is turned
  back on in the Aiven console (runbook).
- **Vercel Hobby is non-commercial.** Fine for this demo; a commercial launch needs Vercel Pro.
- **Index drift.** Mitigated by the outbox; a nightly count check (Postgres vs index) in the processor logs any
  difference, and `pnpm search:reindex` repairs it.
- **Local memory.** The OpenSearch container needs about 2 GB for Docker (no model runs on it).

## Done when

- All four search paths read from OpenSearch, with a working Postgres fallback.
- Every product write reaches the index through the outbox.
- `pnpm eval:search` shows hybrid at or above today's recall@8 on the eval set, with numbers recorded here.
- Production runs on free tiers only (Aiven, Voyage free tokens, QStash free, Vercel Hobby) with the runbook in
  place.
- `pnpm verify` passes; roadmap ticked; status here updated.
