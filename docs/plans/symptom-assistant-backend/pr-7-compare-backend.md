# PR 7 — Compare mode on the backend (Phase B7)

Status: in progress 2026-11-21. Built on `feature/assistant-web-real-engine` (PR 6) until that merges.
Overview: [Phase B7](README.md#phase-b7--compare-mode-on-the-backend).

## What changes

| File                                                       | Change                                                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `apps/server/src/schemas/assistant.schema.ts`              | `assistantCompareBodySchema` (2–4 unique ids, a question) and the `AssistantCompareEvent`s    |
| `apps/server/src/services/assistant/compare.ts`            | Prompt, the `highlight_row` tool, the product data the model reads, and the `runCompare` loop |
| `apps/server/src/controllers/assistant.controller.ts`      | SSE writing shared by both routes; `compare` loads the products (404 on an unknown id)        |
| `apps/server/src/routes/assistant.routes.ts`               | `POST /assistant/compare` with the same auth, 503 and rate limit as a chat turn               |
| `apps/server/src/openapi/document.ts`, root `README.md`    | The new route                                                                                 |
| `apps/web/src/features/assistant/api/askCompare.ts`        | Replaces `mockCompare.ts`: posts the question, yields the streamed events                     |
| `apps/web/src/features/assistant/api/streamEngine.ts`      | The POST and SSE reading are shared with `askCompare`                                         |
| `apps/web/src/features/assistant/components/CompareDrawer` | Streams the answer in, highlights the row when it arrives, says so on errors                  |
| `apps/web/e2e/assistant.spec.ts`                           | Fakes `POST /api/assistant/compare` as it fakes the chat                                      |

## Decisions in this PR

- **Events:** `text` deltas, one `row` event (`{ kind: "row", row }`) and, for a red flag, the urgent `alert`
  part the chat already uses. The stream ends with `event: done`, errors as in B3.
- **The row comes from a tool,** `highlight_row(row)`, with the seven table rows as an enum. The model answers in
  text and points at the row in the same reply; nothing goes back to it. If it points before writing any text,
  it gets one more call, with tools off, to write the answer. So a question costs one or two model calls.
- **The server loads the products itself** from the ids and gives the model what the table shows, with the
  unit price and stock worked out in code (the same rules as the web table), so the model doesn't do arithmetic.
- **Red flags first:** an urgent symptom in the question gets the urgent alert and no model call.
- **Same rate limit as a chat turn.** A compare question costs about as much, so it counts in the same window.
- **The question is limited to 300 characters**; it's a question about a shortlist, not a consultation.
- Compare questions stay out of the conversation, as in S5.

## Not done here

- No eval cases for compare yet; they can be added to `evals/assistant/` if answers turn out wrong.
