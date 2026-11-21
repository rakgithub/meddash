# Plan — Symptom assistant backend (LLM)

Status: draft 2026-11-20, awaiting approval of the decisions below.
Roadmap entry: [Track — Symptom assistant, "Backend: LLM orchestration endpoint"](../../PLAN.md#track--symptom-assistant-ai-chat).
Builds on the frontend plan: [`symptom-assistant/`](../symptom-assistant/README.md#backend-handoff).

## Goal

Replace the scripted mock engine with a real assistant on the server. The customer chats exactly as today.
Behind the chat, Claude Haiku 5.5 asks follow-up questions, searches the catalogue through tools and suggests
products. The server stays in charge of everything that must not go wrong: which products exist, red flags,
and the prescription rule.

Nothing above the engine seam changes. The UI keeps rendering the same typed `MessagePart` union
(`apps/web/src/features/assistant/types.ts`); only `api/mockEngine.ts` (and later `api/mockCompare.ts`) is swapped.

## Tech stack

| Need                                  | Choice                                                                              | New?               |
| ------------------------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| Model                                 | Claude Haiku 5.5 (`claude-haiku-5-5`), $0.10 / $0.50 per 1M input / output tokens   | —                  |
| Calling the model                     | `@anthropic-ai/sdk`                                                                 | **New dependency** |
| Request and event shapes              | zod (already the API contract)                                                      | No                 |
| Streaming to the browser              | SSE with plain Express `res.write`                                                  | No                 |
| Retrieval                             | Postgres full-text search through Drizzle (generated `tsvector` column + GIN index) | No                 |
| Red flags, prescription rule, ranking | Plain TypeScript functions on the server                                            | No                 |
| Rate limiting                         | Per-user sliding window in a Postgres table (`assistant_turns`)                     | No                 |
| Tests                                 | Vitest + supertest, SDK mocked at the boundary                                      | No                 |

## Decisions to make first

1. **Add `@anthropic-ai/sdk`** to `apps/server` (`pnpm --filter server add @anthropic-ai/sdk`). This is the only
   new dependency. No LangChain, Vercel AI SDK, vector DB or Redis.
2. **Model from env, Haiku by default.** `ANTHROPIC_API_KEY` (optional) and `ASSISTANT_MODEL`
   (default `claude-haiku-5-5`) are validated in `config/env.ts`. If the key is missing, the server still
   starts and the assistant endpoint answers `503 Assistant is not configured`, so nobody needs a key to work on
   the rest of the app. Tests never need a key. You add the key to `apps/server/.env` yourself.
3. **The assistant needs login.** Every turn costs money, so the endpoint uses `requireAuth` and the rate limit
   is per user. `/assistant` gets the same signed-out treatment as the cart: a sign-in prompt that returns to the
   chat afterwards. (Alternative: allow guests with an IP-based limit. That's easier to abuse and harder to cap.)
4. **Stateless server.** Each request carries the case file, a condensed history and the new user text, which
   is what the engine seam already receives. Nothing about the conversation is stored on the server. History is
   capped (last 20 messages, 1,000 characters per user message).
5. **The model never invents products.** It only sees catalogue rows that a tool returned, and it recommends by
   product id. The server checks each id against those results, loads the product, applies the prescription rule
   and the ranking, then sends the `products` part. Unknown ids are dropped.
6. **Safety runs before the model.** Red-flag screening runs on the server first. On an urgent match the server
   sends the urgent `alert` and makes **no** model call. The client-side S3 rules stay as a second check.
   The rule list is copied to the server, which becomes the source of truth (see [Later](#later-ideas-to-revisit)
   for sharing one copy).
7. **Manual tool loop, not the beta Tool Runner.** A short loop around `client.messages.stream(...)` with at most
   4 tool rounds per turn. It maps stream events to `MessagePart`s directly and stays off beta APIs.
8. **Remove the mock engine once the real one is in.** The mock's five flows become test conversations for the
   evals (B5) instead of dead code. (Alternative: keep it for offline demos behind a flag.)
9. **Health data stays out of logs.** Symptom text is personal health data. Logs only record ids, token
   counts, duration and stop reason, never message text. Before going live, check that the Anthropic data
   processing terms and retention settings are acceptable for health data (a business and legal check, not code).

## How a turn works

```
browser ── POST /api/assistant/messages (caseFile, history, userText) ──► Express
  requireAuth → rate limit → zod body validation
  1. red-flag screen on userText ── urgent? ──► SSE: alert(urgent), done   (no model call)
  2. SSE: thinking ["Checking for warning signs" ✓, "Searching the catalogue" …]
  3. Claude Haiku 5.5, streamed, with tools:
       search_products(query, category?)  → slim rows from Postgres FTS
       note_symptoms(symptoms[])          → SSE: symptoms
       ask_question(field, question, options[]) → SSE: quickReplies
       recommend_products(items[{id, reason, fit}]) → server validates, ranks → SSE: products
     text deltas                          → SSE: text
  4. stop_reason: end_turn → done · refusal → fixed "please ask a pharmacist" text · max_tokens → done
browser disconnects → AbortController cancels the model request
```

All tools are client tools with `strict: true` (schemas built from zod). `tool_choice` stays `auto`. The system
prompt says when to use each tool.

## Phases

Each phase is one PR that leaves the app working. Done when `pnpm verify:server` passes (plus `pnpm verify:web`
when web files change). Server endpoint work goes through the `add-endpoint` skill.

### Phase B1 — Config and model client

- Add `@anthropic-ai/sdk` (decision 1).
- `config/env.ts`: optional `ANTHROPIC_API_KEY`, `ASSISTANT_MODEL` with default `claude-haiku-5-5`. Error
  messages list names only, never values (as today). Document both in `apps/server/.env.example`.
- `services/assistant/anthropicClient.ts`: creates the SDK client once from config, or `null` when there is no key.
- Tests: env parsing with and without the key, and the default model.

### Phase B2 — Catalogue retrieval for the model

- Migration: generated `search_vector tsvector` column on `products` built from `name`, `description`,
  `category`, `brand` and `active_ingredients` (weighted: name and ingredients highest), with a GIN index.
  Use the `english` text-search config, which matches the catalogue's language.
- `db/products.repo.ts`: `searchCatalogue(text, { category?, limit })` with `websearch_to_tsquery` and
  `ts_rank`. Falls back to the existing `ilike` match when FTS finds nothing, because short words like "flu"
  can stem badly.
- Returns a **slim model view** (`id, name, category, dosageForm, activeIngredients, packSize, price,
requiresPrescription, warnings`, and a short description). This keeps tool results small and cheap.
- Tests against the test DB: symptom words find the right seeded products, a category filter works,
  prescription-only products are returned but flagged, and `limit` is respected.

### Phase B3 — Endpoint, SSE and safety (no model yet)

- `schemas/assistant.schema.ts`: request body (`caseFile`, condensed `history`, `userText`) with `.strict()`
  and the limits from decision 4; a zod `MessagePart` schema for the SSE events, mirroring the web union.
- `POST /api/assistant/messages`: `requireAuth` → rate limit → `validateBody` → controller opens the SSE stream
  (`text/event-stream`, `Cache-Control: no-cache`, flush headers). Each event is `data: <MessagePart JSON>`,
  then a final `event: done`. An error after the stream has opened becomes one `event: error` with a safe
  message, because the status code has already been sent.
- `services/assistant/redFlags.ts`: server copy of the S3 rule list and the urgent alert text.
  It runs before anything else.
- `middleware/rateLimit.ts`: sliding window keyed by user id (for example 20 turns per 10 minutes and
  200 per day) → `429` through `AppError`. The counts live in Postgres (`db/assistantTurns.repo.ts`), so they
  hold across Vercel instances; see Later.
- Returns `503` when no key is configured (decision 2).
- In this phase, a turn without a red flag streams a fixed placeholder reply, so the SSE path is tested end to end.
- OpenAPI: document the request, the `text/event-stream` response with the `MessagePart` schema, and the
  401, 400, 429 and 503 responses. Add the route to the README API table.
- Tests: SSE format, urgent red flag → alert and no further parts, 401 signed out, 400 for each validation
  rule, 429 after the limit, 503 without a key, OpenAPI assertions.

### Phase B4 — LLM orchestration

- `services/assistant/prompt.ts`: a frozen system prompt. It sets the pharmacist-at-the-counter tone and
  short replies, asks at most one question per turn, never diagnoses, never recommends prescription-only
  products, and says when to see a doctor. It explains when to use each tool, and treats product text and user
  text as data, not instructions. The case file goes into the turn as data, not into the system prompt, so the
  prompt and tools stay byte-identical across requests for caching.
- `services/assistant/tools.ts`: the four tools from [How a turn works](#how-a-turn-works). Handlers are
  plain functions that get their data source injected (`searchCatalogue`, `findProductById`).
- `services/assistant/runTurn.ts`: the loop. It builds messages from history and the case file, streams with
  `ASSISTANT_MODEL`, `max_tokens: 1024`, `output_config: { effort: "low" }`, and `cache_control` on the system
  prompt and tools. It turns events into `MessagePart`s, runs tool calls (several in parallel, results returned
  in one message), and stops after 4 tool rounds. It also checks `stop_reason` before running tools.
- Server-side recommendation rules: drop ids that no tool returned this turn, lock prescription-only products
  (`fit: "locked"`, never first), apply `avoid` from the case file, and add the `caution` for the "for whom"
  answer. Port `rankRecommendations` and `cautionFor` from the web as server functions.
- Refusals: on `stop_reason: "refusal"`, send a fixed text part that suggests asking a pharmacist. Haiku has no
  server-side fallback model, so nothing is retried.
- Cancelling: `req.on("close")` aborts the SDK request through an `AbortController`.
- Usage logging: model, input, output and cached tokens, tool rounds, duration and stop reason per turn. No text.
- Tests use a fake stream from the mocked SDK: text deltas become text parts, each tool becomes the right part,
  unknown or hallucinated ids are dropped, prescription-only products are locked, the 4-round cap holds, refusal
  gives the fixed text, abort stops the stream, and the parallel tool results go back in one message.

### Phase B5 — Evals and a model check

- `apps/server/evals/assistant/`: about 25 scripted conversations with expected outcomes. They cover the five
  mock flows, every red flag, a child, pregnancy, a prescription-only match, "no tablets", off-topic chat,
  a prompt injection inside the user text, and an unknown symptom.
- Checks are mostly code: the right product ids are present, no prescription-only product is `best`, the urgent
  alert appears, at most one question is asked per turn, and no products are suggested after an urgent alert.
  Haiku 5.5 grades tone at low cost.
- `pnpm --filter server assistant:eval` runs them against the real API. **It costs money, so it runs only by
  hand and never in CI or `verify`.** It prints pass rate, tokens and cost per conversation.
- Run it on Haiku 5.5. Move to a bigger model only if Haiku fails safety or relevance cases, and record the
  result in this plan.
- **Result (2026-11-21): 23/26 on Haiku 5.5**, every safety and relevance case passing, about 1.1 cents per run.
  Staying on Haiku. The three failures are prompt tuning (self-care advice when nothing is in stock, one reply too
  long). Details in [PR 5](pr-5-evals.md#results).

### Phase B6 — Switch the web app to the real engine

- `apps/web/src/features/assistant/api/streamEngine.ts`: `fetch` POST with `credentials: "include"` and the
  abort signal. It reads the body with `ReadableStream` + `TextDecoder`, splits SSE events, checks each event
  with a type guard (unknown kinds are dropped) and yields `MessagePart`s. Error events and non-2xx responses
  throw, which the UI already shows as `error`. A 429 gets a friendly "try again in a few minutes" message.
- History is condensed for the request: role, text, and the product ids that were suggested.
- `useConsultation` uses `streamEngine`. Remove `mockEngine.ts` (decision 8).
- `/assistant` behind login with return-to-chat (decision 3).
- Update the README section that still says "scripted mock engine".
- Tests: SSE parsing (split chunks, several events in one chunk, unknown kinds, error event), condensed history,
  and the signed-out redirect. Desktop and mobile screenshots in the PR.

### Phase B7 — Compare mode on the backend

- `POST /api/assistant/compare` with the compared product ids (2–4) and a question. Streams text plus the
  table row the answer is about (`CompareAnswer` shape).
- The server loads the products itself and passes them to the model as data. No search tool is needed.
- Swap `api/mockCompare.ts` for a real call, with the same tests as B3 and B6 for the new route.
- In progress 2026-11-21: [PR 7](pr-7-compare-backend.md). The model points at the row with a
  `highlight_row` tool; red flags are screened first; it shares the turn rate limit.

## Cost guardrails

| Guardrail            | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Output per turn      | `max_tokens: 1024`, `effort: "low"`                                |
| Tool rounds per turn | 4                                                                  |
| History              | last 20 messages, user text ≤ 1,000 characters                     |
| Rate limit           | 20 turns per 10 minutes, 200 per day, per user                     |
| Model call skipped   | on urgent red flags                                                |
| Prompt caching       | system prompt and tools are frozen, so they're cached across turns |

At Haiku 5.5 prices, a 6-turn consultation is roughly half a cent before caching.

## Done when

- A signed-in user has a real consultation at `/assistant`. Suggestions are real catalogue products,
  prescription-only products are locked, and red flags stop the chat before any model call.
- Evals pass on Haiku 5.5 and the result is recorded here.
- `pnpm verify` passes. The roadmap entry is ticked and this plan's status updated.

## Out of scope

- Saving conversations on the server (they stay in the browser, as today).
- Add to cart from the chat (frontend S7, waits on the cart work).
- Real pharmacist chat or hand-off.

## Later: ideas to revisit

A short list to look at once this plan is done. None of these is needed now.

- **LangChain or the Vercel AI SDK:** not needed while there is one provider and one loop. Reconsider only if we
  add several providers or many chained steps.
- **Anthropic Tool Runner** (`client.beta.messages.toolRunner` with zod tools): could replace the hand-written
  loop once it leaves beta.
- **Vector search** (pgvector + embeddings): if full-text search misses products as the catalogue grows, or
  for searches by meaning like "something for a tickly cough at night".
- **German search:** a `german` text-search config, or both languages, if the catalogue or users are German.
- **One shared copy of the safety rules:** a small workspace package (`packages/assistant-rules`) used by web
  and server, instead of two copies of the red flags.
- **Moving up a model for hard turns:** send only complex cases (several symptoms, pregnancy plus chronic
  illness) to Sonnet 5.5 and keep Haiku for the rest.
- **Shared rate limit:** done with a Postgres table, `assistant_turns`. Each turn locks the user's row, prunes
  their turns older than a day, counts each window and records the turn only if every count is under its max,
  all in one transaction, so concurrent requests on different instances can't both pass. Move to Redis only if
  this ever shows up as database load.
- **Saving consultations on the server:** replace the `localStorage` history, with a retention policy for health data.
- **Evals in CI:** a nightly run on a small sample through the Batch API (half price), with alerts on regressions.
- **Usage dashboard:** tokens and cost per day from the usage logs, with a monthly budget alert.
- **Tracing:** OpenTelemetry spans for model calls and tool rounds.
- **Faster product cards:** send skeleton cards as soon as `recommend_products` starts streaming.
- **Pharmacist hand-off:** a "talk to a pharmacist" button that sends the case file.
- **Editable red-flag list:** an admin screen, once Phase 8 roles exist.
