# PR 6 — Switch the web app to the real engine (Phase B6)

Status: in progress 2026-11-21. Branch `feature/assistant-web-real-engine`, stacked on `feature/assistant-evals`
(PR 5), which is stacked on PR 4, until those merge.
Overview: [Phase B6](README.md#phase-b6--switch-the-web-app-to-the-real-engine).

## What changes

Web only; the server contract from B3/B4 is unchanged.

| File (apps/web/)                                          | Change                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/features/assistant/api/streamEngine.ts`              | New engine: POST `/api/assistant/messages`, reads the SSE body, yields typed `MessagePart`s |
| `src/features/assistant/hooks/useConsultation.ts`         | Uses `streamEngine`; keeps an `AssistantError` message on the failed reply                  |
| `src/features/assistant/types.ts`, reducer, `MessageList` | `Message.error`: the failed reply says why (rate limit, not configured) when known          |
| `src/features/assistant/components/Composer`              | `maxLength={1000}`, the server's limit for `userText`                                       |
| `src/App.tsx`                                             | `/assistant` behind `RequireAuth`; login returns to the chat, query string included         |
| `api/mockEngine.ts`, `api/loadProducts.ts`                | Removed (decision 8); the server sends full products, so nothing loads them in the browser  |
| `e2e/assistant.spec.ts`                                   | Signs in; fakes only the paid endpoint with scripted SSE; adds the signed-out redirect      |

## Decisions in this PR

- **Two turns never reach the server.** An urgent red flag in the user's text shows the alert at once (the
  client copy of the rules, as a second check behind the server's), and an area chip ("My nose and throat")
  answers with that area's fixed symptom list, as the mock did. Neither needs the model, so neither costs a turn.
- **History is condensed in the engine**: role, text and the ids of the last products shown, last 20 messages,
  which is what the server accepts. The server clips long texts itself.
- **Unknown event kinds are dropped** by a type guard. An `error` event, a non-2xx response or a stream that ends
  without `done` throws an `AssistantError`; a 429 gets "try again in a few minutes".
- **e2e fakes `POST /api/assistant/messages` with `page.route`.** The real endpoint needs an API key and costs
  money per turn, so it stays out of `verify` and CI (like the evals). The fake answers in the real SSE format
  with real catalogue products fetched from the API, so the browser's stream parsing and the cards are covered;
  the server's turn logic has its own tests and the evals.
- **Compare stays scripted** (`mockCompare.ts`) until B7.

## Not done here

- Screenshots against the real model need `ANTHROPIC_API_KEY` locally; the PR shows the flow with the e2e fake.
