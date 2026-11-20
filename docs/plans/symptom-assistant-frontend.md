# Symptom assistant plan — frontend first

Status: S1 done 2026-11-20. Roadmap entry: [`docs/PLAN.md`](../PLAN.md#track--symptom-assistant-ai-chat).

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
  | { kind: "quickReplies"; question: string; field: CaseField; options: QuickReply[] }
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

- [ ] `SymptomChips`: the symptoms the assistant pulled from the user's text, shown as chips with remove (×) and
      "+ add". Editing them updates the case file.
- [ ] `QuickReplies`: one question with 2–5 option buttons (duration, who it is for, dosage-form preference). The
      choice is echoed as a user message and the old options become read-only.
- [ ] `ChatProductCard`: image, name, brand, dosage-form icon (tablet, syrup, spray, cream), price, stock badge
      (reuses `formatStock` / `formatPrice`), and a **"Why this?"** line. Links to `/products/:id`.
- [ ] `RecommendationStack`: cards slide up from the message, with the "Best fit" card slightly larger. On mobile
      it becomes a horizontal scroll-snap carousel.
- [ ] Ingredient pills on each card. Tapping one sends "Tell me about <ingredient>". The mock answers in one line
      and offers same-ingredient alternatives. A cheaper generic is labelled "same ingredient, €X cheaper".
- [ ] Prescription-only items render `fit: "locked"`: greyed out with "Needs a prescription" and a link to the
      existing `UploadPrescriptionButton` flow.
- [ ] Loading skeleton for cards while `fetchProduct` resolves. A card whose fetch fails is dropped quietly, with
      a short "1 suggestion unavailable" note.
- [ ] Tests: each component, plus a keyboard-only path through quick replies and cards. e2e: symptoms → answer 2
      questions → see product cards → open one.

## Phase S3 — Safety layer

The goal is that the assistant knows when **not** to recommend.

- [ ] Red-flag interrupt: the mock checks for urgent symptoms (chest pain, trouble breathing, signs of stroke,
      very high fever in an infant, blood in vomit or stool, suicidal thoughts). On a match it streams an
      `alert{level:"urgent"}`: a calm full-width card ("This needs a doctor now: call 112 or your GP"). No
      products are shown and the recommendation flow is paused until the user starts over.
- [ ] Contextual warnings: when a card's `warnings` text matches the case file (pregnant, child, senior), the
      card shows an amber caution row and drops to `fit: "good"` or lower.
- [ ] Hard rule in the reducer, not only the mock: a product with `requiresPrescription` is never shown with
      `fit: "best"`. This keeps the rule in place when the real backend arrives.
- [ ] "Talk to a pharmacist" action on every recommendation message. For now it is a static contact card.
- [ ] Tests: each red-flag phrase blocks products, the prescription rule, warning matching. e2e: urgent phrase →
      urgent card, no products.

## Phase S4 — Case file and refine

The goal is that the user can see and steer what the assistant understood.

- [ ] `CaseFilePanel`: a right-hand panel on desktop, a collapsible chip bar under the header on mobile. It shows
      symptoms, duration, who it is for and what to avoid. Each item can be edited inline, and an edit triggers a
      fresh recommendation.
- [ ] "Not for me" on each card, with a reason (`Too expensive`, `I don't swallow tablets`, `Already tried`,
      `Other`). The card animates out, the reason is added to `caseFile.avoid`, and the stack re-ranks.
- [ ] "Start over" clears the conversation, after a confirmation if the user has answered anything.
- [ ] Tests: editing the case file re-runs the engine with the new input, and dismissed products don't come back.

## Phase S5 — Compare mode

The goal is helping the user decide between the final 2–3 options.

- [ ] "Compare" button on a recommendation stack. It opens a drawer (bottom sheet on mobile) with a side-by-side
      table: active ingredients, dosage form, pack size, price per unit, warnings, stock.
- [ ] Rows that differ are highlighted. Follow-up questions while the drawer is open ("which is gentler on the
      stomach?") make the mock answer and highlight the relevant row.
- [ ] Accessible table markup (`<table>`, `scope` on headers). The drawer traps focus and closes on Esc.
- [ ] Tests: comparison derivation is a pure util, plus drawer keyboard behaviour.

## Phase S6 — Body map entry

The goal is a visual way to start for users who don't know the words for their symptoms.

- [ ] Optional first screen alongside the starter prompts: a simple front-facing body outline (inline SVG) with
      about 8 tappable regions (head, eyes, nose/throat, chest, stomach, skin, joints, sleep/mind).
- [ ] Choosing a region sends it as the first message and shows that region's common symptoms as chips to pick
      from.
- [ ] Each region is a real `<button>` with a label. The outline is decorative only and has a list fallback on
      small screens.
- [ ] Tests: region selection seeds the case file. e2e: tap throat → pick symptoms → see cards.

## Phase S7 — Polish and integrations

- [ ] Add to cart from a card, with a cart pill in the chat header that pulses on add. **Depends on Phase 5
      (Cart).**
- [ ] Save consultation: when signed in, a summary card ("Sore throat, 2 days → 3 suggestions") the user can
      reopen. Needs a backend endpoint, so it is stored only in the browser until the backend plan.
- [ ] Motion pass: one consistent easing scale, every animation disabled under `prefers-reduced-motion`.
- [ ] Accessibility pass: screen-reader announcements for streamed messages, visible focus on every chip and card,
      contrast in both themes.

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
