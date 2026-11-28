# Plans

One folder per piece of work. `README.md` in the folder is the overview plan; when it is split into
PRs that need their own detail, each gets a `pr-<n>-<kebab-name>.md` next to it. The roadmap is
[`docs/PLAN.md`](../PLAN.md); every plan links the roadmap entry it belongs to.

| Plan                                                                                      | Roadmap                        | Status                       |
| ----------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------- |
| [Postgres products DB](postgres-products-db/)                                             | Phase 1                        | Done                         |
| [Symptom assistant (frontend)](symptom-assistant/)                                        | Symptom assistant track        | S1–S6 done; S7 waits on cart |
| [Product detail, cart, orders](cart-orders/)                                              | Phase 5, Phase 6               | Draft                        |
| ↳ [PR 1 — Header and account menu](cart-orders/pr-1-header-account-menu.md)               |                                | Draft                        |
| [Symptom assistant backend (LLM)](symptom-assistant-backend/)                             | Symptom assistant track        | Draft                        |
| ↳ [PR 4 — LLM orchestration](symptom-assistant-backend/pr-4-llm-orchestration.md)         |                                | In progress                  |
| ↳ [PR 5 — Evals and a model check](symptom-assistant-backend/pr-5-evals.md)               |                                | In progress                  |
| ↳ [PR 6 — Web app on the real engine](symptom-assistant-backend/pr-6-web-real-engine.md)  |                                | In progress                  |
| ↳ [PR 7 — Compare mode on the backend](symptom-assistant-backend/pr-7-compare-backend.md) |                                | In progress                  |
| [1,000-product catalogue](bulk-product-import/)                                           | Phase 2 (builds on)            | In progress                  |
| [OpenSearch search platform](opensearch-search/)                                          | Search platform track          | PR 1 in progress             |
| [Design system](design-system/)                                                           | Design system track            | Draft                        |
| [Assistant-first redesign](assistant-first-redesign/)                                     | Assistant-first redesign track | PR 1 in progress             |

Keep the status here in step with the `Status:` line at the top of each plan.
