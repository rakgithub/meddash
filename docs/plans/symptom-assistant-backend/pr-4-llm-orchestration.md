# PR 4 — LLM orchestration (Phase B4)

Status: in progress 2026-11-21. Branch `feature/assistant-llm-orchestration`, from `main` after
Phase B3 (PR #39) and the Postgres rate limit (PR #40) merged.
Overview: [Phase B4](README.md#phase-b4--llm-orchestration).

## What changes

The B3 placeholder reply is replaced by Claude Haiku 5.5 behind the same `runTurn` generator. The route,
request body, SSE format and `MessagePart` contract stay the same, so no web or OpenAPI change.

| File (apps/server/src/services/assistant/) | What it does                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `prompt.ts`                                | Frozen system prompt; turns history + case file + user text into `messages`      |
| `tools.ts`                                 | The four tool definitions (`strict: true`) and their zod input schemas           |
| `recommendations.ts`                       | Server rules for suggestions: known ids only, avoid list, lock Rx, caution, rank |
| `runTurn.ts`                               | Red flags first, then the streamed tool loop (max 4 tool rounds)                 |

## Decisions in this PR

- **A narrow model seam.** `runTurn(input, deps)` gets `stream(params, signal)` and the data functions
  (`searchCatalogue`, `findProductById`) injected. Production passes `client.messages.stream`; tests pass a
  fake stream. No SDK mocking with `vi.mock`.
- **Tool JSON schemas are hand-written next to their zod schemas.** zod 3 has no JSON Schema export and
  adding `zod-to-json-schema` is a new dependency. `strict: true` makes the API enforce the JSON schema; zod
  still validates each input before it runs, as a second check.
- **No `eager_input_streaming`.** Tool inputs here are a few hundred bytes, and eager streaming turns off the
  server-side validation that `strict` gives.
- **Round cap with `tool_choice: none`.** After 4 tool rounds the last call is sent with `tool_choice: none`,
  so the user still gets a text answer instead of a silent stop.
- **The case file goes into the last user message** as a `<case_file>` JSON block, so the system prompt and
  tools stay byte-identical for caching (`cache_control` on the system block covers tools + system).
- **History mapping.** Leading assistant messages are dropped (the API needs a user message first); empty
  assistant messages are skipped; suggested product ids are noted as `[Suggested product ids: …]`.
- **Refusal** → fixed "please ask a pharmacist" text, no retry (Haiku has no server-side fallback).
  **max_tokens** → stop, never run a cut-off tool call.
- **Usage log**: one JSON line per turn on stdout through an injected `logTurn`: model, input/output/cache
  tokens, tool rounds, duration, stop reason. Never message text (health data).
- **Abort.** The controller aborts an `AbortController` on `res.on("close")` and does not log the resulting
  abort error.

## Tests

Fake stream from the injected seam: text deltas become text parts; each tool becomes the right part;
unknown ids are dropped; Rx products are locked and never first; the avoid list removes tablets; the caution
is added for the "for whom" answer; the 4-round cap sends `tool_choice: none`; refusal gives the fixed text;
max_tokens does not run tools; parallel tool results go back in one user message; abort passes the signal;
the history and case file mapping.

## Done when

`pnpm verify:server` passes, and a manual turn with a real key in `apps/server/.env` streams a real answer.
