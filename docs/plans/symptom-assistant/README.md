# Symptom assistant plan — frontend first

Status: S1–S6 done 2026-11-20. S7 done except add to cart, which waits for Phase 5 (Cart). Roadmap entry: [`docs/PLAN.md`](../../PLAN.md#track--symptom-assistant-ai-chat).

A chat where a customer describes symptoms and gets suggested over-the-counter products from the catalogue,
shown as product cards inside the chat. It should feel like a pharmacist at the counter: a short guided
consultation that ends in a shortlist, not a chatbot on top of a search grid.

This plan covers the **frontend only**. The AI runs behind a typed message protocol. Phases S1–S6 use a scripted
mock engine in the browser, so the UI can be built, tested and demoed before the backend exists. The backend
(an LLM orchestrating over the products DB) is a later plan. It plugs in by replacing one file (see
[Backend handoff](#backend-handoff)).

Each phase is one PR that leaves the app working, is done when `pnpm verify:web` passes, and attaches desktop and
mobile screenshots.

## Decisions to make first

1. **No new dependencies.** Animations use CSS transitions and keyframes. The body map is a hand-drawn inline SVG.
   Streaming uses an async generator now and `fetch` + `ReadableStream` (SSE) later.
2. **The message protocol is the contract.** The UI renders only typed message parts, never free-form HTML from
   the AI. That also keeps model output from being rendered as HTML.
3. **The mock uses real products.** The mock engine matches symptoms to keywords, maps them to product ids from the
   seeded catalogue, and loads those through the existing `fetchProduct`. Cards show real data and link to the
   real detail page. Only the "reasoning" is scripted.
4. **Where it lives.** New feature folder `src/features/assistant/` and a new route `/assistant`. Product types
   come from `features/products` (`ProductDetail`) through its `index.ts`.
5. **State.** The whole conversation is held in one `useReducer` inside a `useConsultation` hook: messages, case
   file and dismissed products. This is the one custom hook worth adding, because several components read and
   change the same state. No context and no global store. Props are enough while everything lives under one page.
6. **Prescription-only products are never recommended.** If one matches, it appears locked and explained, never
   as the top suggestion (the same rule as Phase 3).

## Message protocol (shared by every phase)

`src/features/assistant/types.ts`:

```ts
type Role = "user" | "assistant";

type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "thinking"; steps: { label: string; done: boolean }[] }
  | { kind: "symptoms"; symptoms: Symptom[] } // editable chips
  | {
      kind: "quickReplies";
      question: string;
      field: CaseField;
      options: QuickReply[];
    }
  | { kind: "products"; items: Recommendation[] }
  | { kind: "alert"; level: "urgent" | "caution"; title: string; body: string };

interface Recommendation {
  product: ProductDetail;
  reason: string; // the "Why this?" line
  fit: "best" | "good" | "locked"; // locked = prescription-only
}

interface CaseFile {
  symptoms: Symptom[];
  duration: string | null;
  forWhom: "me" | "child" | "pregnant" | "senior" | null;
  avoid: string[]; // e.g. "tablets", "drowsiness"
}

// The single seam between the UI and the AI.
type AssistantEngine = (input: {
  caseFile: CaseFile;
  history: Message[];
  userText: string;
  signal: AbortSignal;
}) => AsyncIterable<MessagePart>;
```

---

## Phase S1 — Chat shell and streaming

The goal is a working chat that streams a scripted reply.

- [x] Route `/assistant` and an `AssistantPage` laid out as a full-height chat, centred on desktop and full
      screen on mobile.
- [x] `MessageList` scrolls to the newest message (unless the user has scrolled up), with an `aria-live="polite"`
      region for new assistant messages.
- [x] `Composer`: auto-growing textarea, Enter sends, Shift+Enter adds a new line. It is disabled while a reply
      streams and offers a Stop button, which aborts through `AbortSignal`.
- [x] `ThinkingSteps`: steps tick one by one ("Understanding symptoms → Checking catalogue → Filtering
      prescription-only → 3 matches"), then collapse into one line the user can expand.
- [x] Text streams in token by token. Respect `prefers-reduced-motion`: show it at once, no animation.
- [x] Empty state: a short greeting plus 3–4 starter prompts ("Sore throat and fever", "Can't sleep",
      "Hay fever", "Upset stomach").
- [x] Persistent disclaimer under the composer: "Suggestions, not a diagnosis. Ask a pharmacist."
- [x] Entry point: a "Not sure what you need?" button on the products page that opens `/assistant`, pre-filled
      with the current search text.
- [x] `api/mockEngine.ts` implements `AssistantEngine` with scripted flows and small delays.
- [x] Error state: if the engine throws, show an inline "Something went wrong" with Retry. The conversation is
      kept.
- [x] Tests: reducer, composer keyboard behaviour, streaming render, abort. e2e: open from the products page →
      send a starter prompt → see a reply.

Notes from the build (2026-11-20):

- The composer stays editable while a reply streams; only sending is blocked and Send becomes Stop. A disabled
  textarea would drop keyboard focus to the page on every send.
- The entry point is a link (it navigates), labelled "Not sure what you need?". It pre-fills the message box
  but does not send.
- `types.ts` has only the `text` and `thinking` parts and no `caseFile` in the engine input yet; S2 adds them
  when something uses them. Consecutive `text` parts are deltas; a `thinking` part replaces the previous one.

## Phase S2 — Structured replies and product cards

The goal is a chat whose replies are things the user can tap, not only text.

- [x] `SymptomChips`: the symptoms the assistant pulled from the user's text, shown as chips with remove (×) and
      "+ add". Editing them updates the case file.
- [x] `QuickReplies`: one question with 2–5 option buttons (duration, who it is for, dosage-form preference). The
      choice is echoed as a user message and the old options become read-only.
- [x] `ChatProductCard`: image, name, brand, dosage-form icon (tablet, syrup, spray, cream), price, stock badge
      (reuses `formatStock` / `formatPrice`), and a **"Why this?"** line. Links to `/products/:id`.
- [x] `RecommendationStack`: cards slide up from the message, with the "Best fit" card slightly larger. On mobile
      it becomes a horizontal scroll-snap carousel.
- [x] Ingredient pills on each card. Tapping one sends "Tell me about <ingredient>". The mock answers in one line
      and offers same-ingredient alternatives. A cheaper generic is labelled "same ingredient, €X cheaper".
- [x] Prescription-only items render `fit: "locked"`: greyed out with "Needs a prescription" and a link to the
      existing `UploadPrescriptionButton` flow.
- [x] Loading skeleton for cards while `fetchProduct` resolves. A card whose fetch fails is dropped quietly, with
      a short "1 suggestion unavailable" note.
- [x] Tests: each component, plus a keyboard-only path through quick replies and cards. e2e: symptoms → answer 2
      questions → see product cards → open one.

Notes from the build (2026-11-20):

- The mock asks two questions (how long, who it is for) before recommending. Dosage-form preference is left
  for S4, where `avoid` gets used.
- `products` parts are snapshots like `thinking`: the mock first sends `{ items: [], loading: n }` for the
  skeletons, then the loaded cards with an `unavailable` count. Product data comes through `fetchProduct`.
- `rankRecommendations` already forces prescription-only products to `locked` and sorts them last; S3 still
  moves that rule into the reducer.
- The catalogue is small, so some flows suggest one product (hay fever, sleep) and upset stomach suggests
  none, saying so in the reply.
- "Tell me about <ingredient>" compares against the priciest suggested product with that ingredient, so a
  cheaper one is labelled "Same ingredient, X € cheaper".
- The chips show the live case file only on the latest symptom list; older lists and answered questions
  stay as a read-only record. The chosen answer is derived from the next user message.

## Phase S3 — Safety layer

The goal is that the assistant knows when **not** to recommend.

- [x] Red-flag interrupt: the mock checks for urgent symptoms (chest pain, trouble breathing, signs of stroke,
      very high fever in an infant, blood in vomit or stool, suicidal thoughts). On a match it streams an
      `alert{level:"urgent"}`: a calm full-width card ("This needs a doctor now: call 112 or your GP"). No
      products are shown and the recommendation flow is paused until the user starts over.
- [x] Contextual warnings: when a card's `warnings` text matches the case file (pregnant, child, senior), the
      card shows an amber caution row and drops to `fit: "good"` or lower.
- [x] Hard rule in the reducer, not only the mock: a product with `requiresPrescription` is never shown with
      `fit: "best"`. This keeps the rule in place when the real backend arrives.
- [x] "Talk to a pharmacist" action on every recommendation message. For now it is a static contact card.
- [x] Tests: each red-flag phrase blocks products, the prescription rule, warning matching. e2e: urgent phrase →
      urgent card, no products.

Notes from the build (2026-11-20):

- Red flags live in `utils/redFlags.ts` (`redFlagAlert`), checked first in the mock, before "Tell me about".
  Matching errs on the side of caution, so "no chest pain" still matches. Suicidal thoughts get a crisis line
  (Telefonseelsorge) instead of the GP text.
- "Paused" is derived, not stored: `isPaused(messages)` is true once any reply has an urgent alert. While
  paused the reducer drops `products` and `quickReplies` parts and ignores `send`; the page swaps the message
  box for "Start over" (a `reset` action, no confirmation yet; S4 adds that) and makes earlier replies
  read-only.
- The reducer runs every `products` part through `rankRecommendations(items, caseFile.forWhom)`, which locks
  prescription-only products and adds `caution` (the first matching warning sentence) for pregnant, child
  and senior. "Senior" matches kidney and liver warnings too. A cautioned best fit drops to good, so a stack
  can have no "Best fit".
- "Talk to a pharmacist" is a `<details>` under every non-empty stack. The phone number is a placeholder.

## Phase S4 — Case file and refine

The goal is that the user can see and steer what the assistant understood.

- [x] `CaseFilePanel`: a right-hand panel on desktop, a collapsible chip bar under the header on mobile. It shows
      symptoms, duration, who it is for and what to avoid. Each item can be edited inline, and an edit triggers a
      fresh recommendation.
- [x] "Not for me" on each card, with a reason (`Too expensive`, `I don't swallow tablets`, `Already tried`,
      `Other`). The card animates out, the reason is added to `caseFile.avoid`, and the stack re-ranks.
- [x] "Start over" clears the conversation, after a confirmation if the user has answered anything.
- [x] Tests: editing the case file re-runs the engine with the new input, and dismissed products don't come back.

Notes from the build (2026-11-20):

- `CaseFilePanel` sits beside the chat on desktop (sticky) and becomes a collapsed bar above it on a phone, with
  a one-line summary. Duration and who it is for are `<select>`s; symptoms reuse `SymptomChips`.
- A panel edit is sent through the engine as a user message (`Changed duration to Longer`, `Added symptom: X`,
  `Removed a symptom`, `Updated what to avoid`), with the new case file in the same `send` action. So an added
  symptom goes through red-flag screening like typed text. A removed symptom is not named, so the mock can't read
  it as a new one. The panel is read-only while a reply streams and after an urgent alert.
- The chips inside a reply are now read-only and follow the case file. The panel is the one place to edit, so
  every edit re-runs the engine. The `setSymptoms` action is gone.
- "Not for me" does not call the engine. `dismiss` adds the product id to `state.dismissed` and the reason to
  `caseFile.avoid` (`Expensive options`, `Tablets`, `Already tried <name>`, `Not <name>`), then `ruleOut` drops
  dismissed products from every stack, now and when later replies arrive. If the best fit goes, the first good
  fit without a caution becomes the best fit. Products parts get `ruledOut`, the count left out.
- Only `Tablets` filters other products (tablets, capsules and caplets; lozenges stay). The other avoid entries
  are recorded for the backend and shown in the panel. Removing an avoid entry affects later replies only.
- "Start over" asks first ("Clear this conversation and your case file?"), also after an urgent alert. It sits
  at the bottom of the panel, and in that state in place of the message box.

## Phase S5 — Compare mode

The goal is helping the user decide between the final 2–3 options.

- [x] "Compare" button on a recommendation stack. It opens a drawer (bottom sheet on mobile) with a side-by-side
      table: active ingredients, dosage form, pack size, price per unit, warnings, stock.
- [x] Rows that differ are highlighted. Follow-up questions while the drawer is open ("which is gentler on the
      stomach?") make the mock answer and highlight the relevant row.
- [x] Accessible table markup (`<table>`, `scope` on headers). The drawer traps focus and closes on Esc.
- [x] Tests: comparison derivation is a pure util, plus drawer keyboard behaviour.

Notes from the build (2026-11-20):

- The Compare button sits above "Talk to a pharmacist" and shows when at least two suggestions can be
  compared. It compares the first three that are not prescription-only, in stack order. Open state is local to
  `RecommendationStack`, so it never enters the reducer.
- `CompareDrawer` is a native modal `<dialog>` like the products `RefinePanel`: a drawer from the right on wide
  screens, a bottom sheet under 768px. The browser gives focus trapping and Esc; focus goes to Close on open and
  back to the Compare button on close. The table scrolls sideways on a phone with the feature column pinned.
- `utils/compareProducts.ts` builds the rows. It adds a plain Price row next to price per unit. The unit price is
  read from a pack size like "20 tablets" and is "—" when the size has no leading count.
- Differing rows get a tint and a "Differs" badge, so colour is not the only cue. The row an answer is about gets
  a stronger highlight and `aria-current`.
- Questions are asked in the drawer, not the chat composer, because the modal makes the page behind it inert.
  They are answered by `api/mockCompare.ts` from the real product data (stomach-related warnings, cheapest per
  unit, stock, pack size, ingredients, form) and do not go through the engine or into the conversation. At the
  backend handoff this is a second seam to replace, or to route through the engine with the compared products.
  Replaced in backend Phase B7 by `api/askCompare.ts` and `POST /api/assistant/compare`.

## Phase S6 — Body map entry

The goal is a visual way to start for users who don't know the words for their symptoms.

- [x] Optional first screen alongside the starter prompts: a simple front-facing body outline (inline SVG) with
      about 8 tappable regions (head, eyes, nose/throat, chest, stomach, skin, joints, sleep/mind).
- [x] Choosing a region sends it as the first message and shows that region's common symptoms as chips to pick
      from.
- [x] Each region is a real `<button>` with a label. The outline is decorative only and has a list fallback on
      small screens.
- [x] Tests: region selection seeds the case file. e2e: tap throat → pick symptoms → see cards.

Notes from the build (2026-11-20):

- `utils/bodyRegions.ts` holds the eight regions with their symptoms, plus `regionMessage` ("My nose and
  throat") and `regionFromMessage`. Only that exact message is read as a region, never typed text.
- The mock answers a region message with a short line and one quick reply, `field: "symptoms"`, whose options
  are the region's symptoms. The chips are single-pick, like every quick reply. A pick is echoed as the user's
  message and `applyAnswer` adds it to the case file at once, so it shows in the case file panel before the
  reply, then the usual duration and who-it-is-for questions follow. More symptoms can be added in the panel.
- The region itself is not stored in the case file: it has no field of its own, and the symptom is what the
  recommendation uses.
- Region symptoms use the mock's own symptom names, so a pick is not stored twice. "Chest pain" is offered
  under Chest on purpose: it is a red flag and gets the urgent alert. "Joint pain" is now its own symptom
  (it was part of "Muscle pain").
- Skin and "Feeling stressed" have no scripted flow, so they get the "tell me a bit more" fallback. The
  catalogue has nothing for them yet.
- ~~`BodyMap` is a fixed 240×460 box: an SVG outline and a list of buttons, each a dot on the body with its
  label beside it.~~ Replaced on 2026-11-20 by a plain row of area chips under the starters ("Or start from
  where it bothers you"): the outline took most of the empty state, its labels covered the figure, and areas
  like Skin and Sleep and mind have no place on a body. Same regions, same messages, same flow.

## Phase S7 — Polish and integrations

- [ ] Add to cart from a card, with a cart pill in the chat header that pulses on add. **Depends on Phase 5
      (Cart)**, which isn't built yet (no cart endpoints or UI), so this item is still open.
- [x] Save consultation: when signed in, a summary card ("Sore throat, 2 days → 3 suggestions") the user can
      reopen. Needs a backend endpoint, so it is stored only in the browser until the backend plan.
- [x] Motion pass: one consistent easing scale, every animation disabled under `prefers-reduced-motion`.
- [x] Accessibility pass: screen-reader announcements for streamed messages, visible focus on every chip and card,
      contrast in both themes.

Notes from the build (2026-11-20):

- `utils/savedConsultations.ts` stores up to 10 consultations per user in `localStorage`
  (`meddash-consultations-<userId>`), newest first. An entry is the whole reducer state plus a title and
  suggestion count. The id is the first message's id, so saving the same consultation again replaces it.
  Entries are checked on load and unreadable ones are dropped. Prices and stock in a reopened consultation
  are as they were when saved. Nothing is cleared on sign-out. Health data stays on that device until the
  server endpoint replaces this.
- "Save consultation" sits in the case file panel once there are suggestions, signed in only. "Your
  consultations" is on the start screen with Reopen and Remove. Reopen dispatches `restore`, which marks a
  reply saved mid-stream as stopped.
- Motion tokens in `global.css`: `--ease-out` (arrivals), `--ease-in` (exits), `--ease-in-out` (hover, state,
  loops), `--duration-fast/base/slow` (150/220/420ms). Every assistant animation uses them, except the
  spinner (linear) and the caret blink (steps). A global `prefers-reduced-motion` rule shortens every
  animation and transition to 1ms, so `animationend` still fires. The per-component rules stay.
- The live region now says "Assistant is replying…" while a reply streams. When the reply finishes it reads
  the text, the question with its options, and the suggestions by name (prescription-only products are
  left out). A stopped reply ends with "Reply stopped". Alerts and errors are left out because they are
  `role="alert"` already.
- Focus: every control in a finished consultation shows the global `:focus-visible` ring, including the
  cards in the mobile scroll strip, and none is clipped. I checked this in the browser. The composer uses
  its own `:focus-within` ring.
- Contrast: every text token pair passes 4.5:1 in both themes once light `--accent-soft-hover` is
  `#d8eee9` (it was 4.42:1). `--border-strong` is about 1.6:1. That's fine for buttons with a text label,
  but it is not a 3:1 edge.

---

## Backend handoff

When the backend plan is ready:

- Swap `api/mockEngine.ts` for `api/streamEngine.ts`, which `POST`s to `/api/assistant/messages` and parses SSE
  events into the same `MessagePart` union, validated on arrival (unknown kinds are dropped).
- The new endpoint goes through the `add-endpoint` skill. The server owns retrieval (search over `description`,
  `activeIngredients`, `category`), red-flag screening and the prescription rule. The client-side rules from S3
  stay as a second check.
- Nothing above the engine seam should change.

## Out of scope for this plan

- The LLM, prompt design, retrieval and the server endpoint.
- Real pharmacist chat or hand-off.
- Saving conversations server-side.
