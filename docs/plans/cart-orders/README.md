# Plan — Product detail redesign, cart, orders, account menu

Status: draft 2026-11-20, awaiting approval of the decisions below.
Roadmap entries: [Phase 5 — Cart](../../PLAN.md#phase-5--cart) and the orders part of
[Phase 6 — Checkout and orders](../../PLAN.md#phase-6--checkout-and-orders). Payment (Phase 7) stays out of scope.

## Goal

- The product detail page is redesigned around a buy box: quantity stepper and **Add to cart**.
- A new **cart page** lets the user change quantities, remove items and see the subtotal, then place an order.
- A new **orders page** lists the user's orders, with an order detail view.
- The login and register pages show a slim header: no search bar, no prescription button.
- When signed in, the header shows a **user icon** that opens a menu with **Profile** and **Log out**.
  A new **profile page** shows the account details.

## Decisions to make first

1. **Cart storage: server, per user (as Phase 5 says).** The cart lives in Postgres and needs login.
   Signed-out users who click Add to cart go to `/login` and return to the product afterwards (the
   `state.from` flow `UserMenu` already uses).
   Alternative: a signed-out cart in `localStorage` merged into the server cart on login. That adds a
   merge step and conflict rules, so leave it for later.
2. **Orders without payment.** "Place order" on the cart page creates an order in `pending_payment`
   and clears the cart. Phase 7 adds payment on top. No shipping address in this plan: the
   `addresses` table and checkout form stay in Phase 6.
3. **Slim header on `/login` and `/register` both.** Brand link and theme toggle only.
4. **Profile is read-only.** Name, email, member since. Editing name or password is a separate change.
5. **No new dependencies.** The dropdown is a plain button + list with keyboard and outside-click
   handling, no UI library. Icons are inline SVG like the existing header mark.
6. **Prescription-only products stay blocked.** The server rejects them on `POST /api/cart/items`;
   the detail page keeps the explanation and the disabled button.

## Steps

Each step leaves the app working. Split into PRs at the marked points.

### PR 1 — Header and account menu (web only)

Detailed plan: [pr-1-header-account-menu.md](pr-1-header-account-menu.md).

1. **Slim header on auth routes.** `AppHeader` reads `useLocation()`; on `/login` and `/register` it
   renders only the brand and `ThemeToggle`.
2. **User icon menu.** Replace the name + "Log out" button in `UserMenu` with:
   - A round icon button (initials of `user.name`, accessible name "Account menu"),
     `aria-haspopup="menu"`, `aria-expanded`.
   - A menu with the user's name and email as a header, then **Profile** (link to `/profile`),
     **Orders** (link to `/orders`) and **Log out**.
   - Closes on Escape, outside click and after choosing an item; focus returns to the button.
   - Keeps the existing logout error message.
3. **Profile page** `features/auth/components/ProfilePage` at `/profile`. Data from the existing
   `GET /api/auth/me`; add `createdAt` to the response if "member since" is wanted (use the
   `add-endpoint` skill for that shape change). Signed-out users are sent to `/login`.
4. **Route guard.** A small `RequireAuth` element in `features/auth` used by `/profile`, `/cart`
   and `/orders`: shows nothing while loading, redirects to `/login` with `state.from` when signed out.
5. Tests: `AppHeader` hides search on `/login` and `/register`; `UserMenu` opens, shows Profile and
   Log out, closes on Escape, logs out; `ProfilePage` states; `RequireAuth` redirect.
   e2e: log in → open the menu → Profile → Log out.

### PR 2 — Cart API (server, `add-endpoint` skill for each route)

1. Drizzle schema + migration:
   - `carts`: `id`, `user_id` (unique, FK `users`), timestamps.
   - `cart_items`: `cart_id`, `product_id` (composite PK), `quantity` (check `> 0`), timestamps.
2. Endpoints, all behind `requireAuth`:

   | Method   | Path                         | Body                      | Result                           |
   | -------- | ---------------------------- | ------------------------- | -------------------------------- |
   | `GET`    | `/api/cart`                  | —                         | cart                             |
   | `POST`   | `/api/cart/items`            | `{ productId, quantity }` | cart (adds to existing quantity) |
   | `PATCH`  | `/api/cart/items/:productId` | `{ quantity }`            | cart                             |
   | `DELETE` | `/api/cart/items/:productId` | —                         | cart                             |

   The cart response is `{ items: [{ product (slim shape), quantity, lineTotal }], itemCount, subtotal }`
   with prices read from `products` at request time (server is the source of truth).

3. Validation: `quantity` integer 1–10 and not above `stock_quantity` (409 with a clear message);
   unknown product 404; prescription-only product 409; out of stock 409.
4. Tests: route tests per endpoint against the test DB, including 401 when signed out, the limits
   above and one user not seeing another's cart. OpenAPI entries.

### PR 3 — Product detail redesign + add to cart (web)

1. **Cart feature** `features/cart/`: `api/` (`getCart`, `addToCart`, `updateCartItem`,
   `removeCartItem` through `lib/apiClient`; add `apiPost`/`apiPatch`/`apiDelete` there if missing),
   `types.ts` mirroring the server schema, and a `CartProvider` context so the header count and the
   pages share one cart. Context is justified here: header, detail page and cart page all read it.
2. **Detail page layout** (follow the `frontend-design` skill):
   - Desktop: two columns. Left: the image well. Right: category/brand chips, name, short
     description, then a **buy box** card: price, stock status, quantity stepper, Add to cart,
     and a delivery/returns note.
   - The buy box is sticky on desktop while the info sections scroll.
   - Info sections (active ingredients, usage, warnings, product details) become a single column
     of disclosure sections (`<details>`), warnings open by default.
   - Mobile: image, title, then the buy box; a sticky bottom bar with price + Add to cart once the
     buy box scrolls out of view.
3. **Quantity stepper** `components/QuantityStepper` (inside `features/cart`, reused on the cart
   page): − / number input / +, min 1, max `min(10, stockQuantity)`, labelled "Quantity".
4. **Add to cart behaviour:**
   - Signed out → go to `/login` with `state.from` set to the product page.
   - While sending: button shows "Adding…" and is disabled.
   - Success: inline confirmation "Added 2 to cart" with a "View cart" link; header count updates.
   - Error: inline message from the server (for example not enough stock); quantity is kept.
   - Out of stock or prescription-only: button disabled with the reason shown next to it.
5. **Header cart link** with the item count (`aria-label="Cart, 3 items"`).
6. Tests: stepper limits; add-to-cart success, error, signed-out redirect; disabled states; header
   count. Update `ProductDetailPage.test.tsx` (the test that expects no Add to cart button on an
   over-the-counter product changes). Screenshots at desktop and mobile in
   `docs/screenshots/product-detail-cart/`.

### PR 4 — Cart page (web)

1. `/cart` (behind `RequireAuth`): list of lines with image, name, link to the product, unit price,
   `QuantityStepper`, line total, Remove. Summary card with item count, subtotal and **Place order**.
2. Quantity changes call `PATCH` and update from the response; Remove calls `DELETE`. Each line
   shows its own pending and error state.
3. Empty state with a link back to products; loading and error states.
4. Tests for each state and action. e2e: add to cart → change quantity → remove (Phase 5 item).

### PR 5 — Orders (server + web)

1. Drizzle schema + migration: `orders` (`id`, `user_id`, `status` enum
   `pending_payment | paid | failed | cancelled`, `total`, timestamps) and `order_items`
   (`order_id`, `product_id`, `name`, `unit_price` and `quantity` snapshotted at order time).
2. Endpoints (`add-endpoint` skill), behind `requireAuth`:
   - `POST /api/orders`: in one transaction, re-reads the cart, re-checks stock and prices,
     creates the order and items, clears the cart. Empty cart → 409.
   - `GET /api/orders`: the user's orders, newest first.
   - `GET /api/orders/:id`: one order; another user's order → 404.
3. Web `features/orders/`:
   - `/orders`: list with order number, date, status badge, item count and total; empty state.
   - `/orders/:id`: items, quantities, unit prices, total, status.
   - Place order on the cart page navigates to the new order's detail page.
4. Tests: route tests (transaction rollback on stock change, ownership 404), component states.
   e2e: cart → place order → order shown in `/orders`.

## Done when

- `pnpm verify` passes for each PR.
- The flows above work in the browser at desktop and mobile widths, in light and dark theme.
- `docs/PLAN.md` boxes for Phase 5 and the orders items of Phase 6 are ticked as they land; S7 in
  the assistant track can then add its "add to cart" using `features/cart`.

## Out of scope

- Payment and order confirmation (Phase 7), shipping addresses and checkout form (Phase 6).
- Signed-out cart, editing the profile, admin views of orders.
