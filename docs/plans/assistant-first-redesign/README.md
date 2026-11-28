# Plan — Assistant-first redesign

Status: approved 2026-11-28, after review (v5 chat only, catalogue at `/shop`, cart stays a page, Orders in
the menu for every signed-in user). Not started; waits for design-system PR 3.
Roadmap entry: [Track — Assistant-first redesign](../../PLAN.md#track--assistant-first-redesign).
Builds on: [Design system](../design-system/README.md) (tokens, and the `Button`, `Chip` and `Badge`
components from its PR 3), [Symptom assistant](../symptom-assistant/README.md),
[Symptom assistant backend](../symptom-assistant-backend/README.md), [Product detail, cart, orders](../cart-orders/README.md).
Design reference: the v5 artboards ("Minimal: v3 theme, top-right menu, new intro", desktop and phone) on the
[MedDash Assistant-first redesign canvas](https://claude.ai/artifact/HetAhLGzNv28APeN9KccPa).

## Goal

- MedDash opens on the assistant, not on a product grid. The first screen is a short intro that ends in one
  question, "How are you feeling today?", with a message box and three starter chips. Whatever the visitor
  types is the first message of the consultation.
- The assistant is the v5 chat and nothing else: one centred column of messages, product rows, quick replies
  and a message box. The case file, progress bar, compare mode, saved consultations and body map go.
- One header on every page: the logo on the left, and a single menu at the top right (Assistant, Medicines,
  Orders, Account or Sign in, Cart). The header search box, the floating assistant launcher and the footer's
  "Ask MedDash" box go, because the assistant is now the front door.
- Shopping happens from the chat: add a suggested product to the cart from its row, see a cart bar above the
  message box, jump to the matching shelf ("More in Allergy") and come back to the same conversation, then
  place the order and land back in the chat, which notes it.
- Browsing stays first-class for people who know what they want: the catalogue moves to `/shop` and keeps
  search, filters and paging.

## What v5 shows

- **Intro.** Dark teal page with a soft glow. Fourteen small capsules spiral into the centre and become the
  message box; the headline arrives word by word ("Hi, I'm your MedDash assistant." / "How are you feeling
  today?"). Starter chips: Hay fever, Dry cough, Can't sleep. Under reduced motion everything is simply there.
- **Assistant.** A single centred chat column (`--width-chat`). Assistant messages carry a caution line when
  relevant, compact product rows with "Add · €3.99" (or "In cart"), "More in <aisle>", an action such as
  "Chat with a pharmacist", and quick replies. Three dots while the assistant is typing. Above the message
  box: a cart bar, "2 items · €10.98 · Checkout", once the cart has something in it. Under the box:
  "Reviewed by pharmacists. Not a substitute for a doctor — in an emergency, call 112."
- **Medicines.** Title, a search field, category chips, a list of product rows with "Ask" (opens the
  assistant about that product) and "Add". A floating "Ask the assistant" button, and "Checkout · €x" when
  the cart is not empty.
- **Cart drawer** from the right, then a **Checkout** page with a delivery address. This plan keeps a cart
  page instead (decision 7). **Order placed** screen with "Back to the assistant".
- **Sign in** with an email link, and "Continue without an account".

## Where things stand

- `/` is the catalogue (`ProductsPage`) with search, category aisles, a refine panel and paging. Search also
  lives in the header (`AppHeader` → `SearchBar`), which sends results to `/`.
- `/assistant` is the assistant (`AssistantPage`): a welcome screen with four starters and a body map, then
  the chat with a case file panel (symptom chips, refine), progress bar, compare drawer, recommendation
  stack, saved consultations and start over. The route and the API are behind sign-in, because every message
  calls a paid model.
- The conversation lives in a `useReducer` inside `AssistantPage`, so leaving the page loses it.
- Product cards in the chat cannot add to the cart yet (the last open item of symptom assistant S7).
- `/cart` is a page that places the order directly; there is no checkout page or address yet (Phase 6).
- `AssistantLauncher` floats on the catalogue; `AppFooter` has an "Ask MedDash" box.

## Decisions

1. **`/` is the assistant; the catalogue moves to `/shop`.** The menu still calls it "Medicines".
   `/products/:id` stays. Old links keep working: `/?q=…&category=…` redirects to `/shop` with the same
   query, and `/assistant` redirects to `/`.
2. **The assistant still needs an account.** The intro is public. A signed-out visitor who sends a first
   message is taken to log in with that message kept, and lands back in the chat with it sent. This keeps
   the paid model behind auth and needs no backend change.
3. **Password login stays; the email link is out of scope.** The canvas's "Email me a sign-in link" needs
   mail delivery and a token flow. "Continue without an account" becomes "Browse medicines", since chatting
   needs an account (decision 2).
4. **The intro plays once per browser session.** After that, `/` opens straight on the message box with the
   headline in place. The logo replays it and starts a new conversation. Stored in `sessionStorage` (a
   per-viewer convenience; losing it only replays the intro). Under `prefers-reduced-motion` there is no
   animation at all.
5. **The live conversation survives navigation.** The consultation state moves from `AssistantPage` into a
   `ConsultationProvider` above the routes, mirrored to `sessionStorage`, so "More in Allergy" → Medicines →
   "Back to your chat" returns to the same messages. A reload in the same tab also keeps it. Signing out
   clears it. It is the only memory of a conversation: saved consultations go (decision 6).
6. **The chat matches v5 strictly.** Removed from the web app, with their tests: `CaseFilePanel`,
   `SymptomChips`, `ConsultationProgress`, `CompareDrawer`, `RecommendationStack`, `SaveConsultation`,
   `SavedConsultations`, `StartOver` (the logo starts over), `AssistantAvatar`, the welcome screen's body map
   and the "Suggestions, not a diagnosis" toggle (the line under the message box replaces it). Kept and
   restyled: `MessageList`, `Composer`, `QuickReplies`, `ChatProductCard` (as a compact row), `SafetyAlert`
   (as the caution line), `PharmacistContact` (as the action button), and `ThinkingSteps` (as the three
   dots). The case file stays in the consultation state, because the backend uses it to ask its questions;
   only its panel goes. The backend's compare endpoint is left in place but unused; removing it is a
   follow-up for the backend plan.
7. **The cart stays a page.** Cart in the header and Checkout on the cart bar both open `/cart`, restyled to
   v5: lines with − / + steppers, a summary, and Place order, which works as today. No drawer and no
   separate checkout page; the delivery address arrives with Phase 6.
8. **The chat notes the order without calling the model.** After an order placed during a consultation, the
   chat shows a local assistant note ("Order #1042 is placed: Cetirizine and Azelastine. Start the tablet
   tonight…") built from the order and the suggestion it came from. No model call, no cost.
9. **Theme toggle moves into the account menu** (or into the top-right menu as an icon on wide screens when
   signed out). Dark stays the default from the design system.

## Routes after the redesign

| Path                     | Page                                        | Auth                  |
| ------------------------ | ------------------------------------------- | --------------------- |
| `/`                      | Intro, then the assistant                   | Public; chat needs it |
| `/shop`                  | Catalogue: search, categories, filters      | Public                |
| `/products/:id`          | Product detail                              | Public                |
| `/cart`                  | Cart and Place order                        | Required              |
| `/orders`, `/orders/:id` | Orders                                      | Required              |
| `/login`, `/register`    | Auth, with `returnTo` and a pending message | Public                |
| `/profile`               | Account                                     | Required              |
| `/assistant`             | Redirects to `/`, keeping `?q=`             |                       |

## Steps

Each PR leaves the app working, passes `pnpm verify`, and commits before and after screenshots (both themes,
desktop and phone) under `docs/screenshots/assistant-first/`. UI work follows the `frontend-design` skill
and uses only design-system tokens and components. Starts once design-system PR 3 (components) is merged.

### PR 1 — Top-right menu and `/shop`

1. `AppHeader`: logo left, one `nav` on the right with Assistant (hidden on `/`), Medicines, Orders (every
   signed-in user, whether or not they have ordered), Account menu or Sign in, Cart (count badge). On phones the labels collapse to icons with accessible
   names; nothing wraps.
2. Move the catalogue to `/shop`. The search field moves from the header into the page title row;
   `SearchSuggest` keeps working there. `useSearchQuery` reads and writes `/shop`.
3. Redirects: `/?<catalogue params>` → `/shop?…`. `/` itself still shows the catalogue in this PR.
4. Theme toggle into the account menu (decision 9).
5. Tests: header links per auth state, redirects keep the query, search from the new field. e2e: product
   browsing specs move to `/shop`.

### PR 2 — Strip the assistant to the v5 chat

1. Remove the components listed in decision 6, with their tests and styles, and the reducer actions only
   they used (refine, dismiss, compare, save, restore). The case file data stays.
2. Restyle what is kept: centred column, compact product rows, caution line, quick replies, three dots,
   the pharmacist line under the message box.
3. The welcome screen becomes a plain message box with the three v5 starters until PR 3 brings the intro.
4. e2e: drop the specs for removed features (case file refine, compare, saved consultations, body map);
   keep symptom → questions → suggestions and the safety cases.

This PR deletes tested features on purpose (decision 6). The PR description lists each one.

### PR 3 — The assistant becomes home, with the intro

1. `ConsultationProvider` above the routes (decision 5); `AssistantPage` reads from it. `sessionStorage`
   persistence with a version key; a stored shape that fails validation is dropped, not trusted.
2. `/` renders `HomePage`: the intro (decision 4), then the chat in place, no route change. `/assistant`
   redirects to `/`, keeping `?q=`.
3. Intro: capsule spiral and word-by-word headline in CSS with design-system motion tokens; starters Hay
   fever, Dry cough, Can't sleep send their message. Reduced motion: no animation, everything visible.
4. Signed-out first message (decision 2): kept in `sessionStorage`, then `/login?returnTo=/`; after login
   the pending message is sent once and cleared.
5. Remove `AssistantLauncher` and the footer's "Ask MedDash" box; the footer is hidden on `/`.
6. Tests: intro plays once and replays from the logo; reduced motion; pending message after login;
   conversation survives Medicines and back, and a reload. e2e: the assistant specs start from `/`.

### PR 4 — Shopping from the chat

1. Chat product rows get "Add · €x" / "In cart" through the cart feature's public API (closes symptom
   assistant S7). Prescription-only products show "Prescription needed" instead, as on the detail page.
2. Cart bar above the message box: item count, subtotal, Checkout (to `/cart`). Announced politely when it
   changes.
3. "More in <aisle>" opens `/shop?category=<aisle>` with a "Back to your chat" bar at the top while a
   consultation is live; "Ask" on a Medicines row opens the chat with "Tell me about <product>".
4. Tests: add from a row updates the bar and the header badge; the back bar only shows with a live
   consultation. e2e: symptom → add → cart bar → Medicines and back.

### PR 5 — Cart page and back to the assistant

1. Restyle `/cart` to v5 (decision 7). A line says which items came from the chat (kept with the
   consultation, not sent to the server).
2. Order placed: `/orders/:id?placed=1` shows "Order placed" with "Back to the assistant" when a
   consultation is live.
3. The local order note in the chat (decision 8).
4. Tests and e2e: symptom → add → cart → place order → back to the chat, which shows the note.

## Testing

- Unit tests per component and hook, querying by role and text; `userEvent` for every flow.
- e2e: the assistant still runs on `page.route` fakes in the real SSE format (no paid calls).
- Motion: every animation has a reduced-motion test (end state is visible at once).
- Accessibility: one `h1` per view, the intro headline is real text, the menu is a `nav` with
  `aria-current`, live regions for the chat and cart bar.
- Visual check per PR in the browser at desktop and phone widths, both themes; screenshots committed.

## Out of scope

- Anonymous consultations and rate limiting (decision 2), email-link sign-in (decision 3).
- Cart drawer, a separate checkout page, delivery address and payment (decision 7, Phase 6, Phase 7).
- Removing the backend's compare endpoint (decision 6).
- Voice input (the canvas's microphone button and level bars).
- The v4 care-plan flow and its light cobalt look.

## Open questions

None. Settled in review: Orders shows in the top menu for every signed-in user (v5 shows it only after a
first order); `/orders` has an empty state until then, and the header needs no extra request.
