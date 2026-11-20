# MedDash roadmap

Incremental phases. Each phase is one PR, leaves the app working, and is done only when
`pnpm verify` passes. Tick a box when it lands on `main`.

## Decisions to confirm before starting

New dependencies need approval (repo rule). Proposed, simplest option first:

| Need | Proposal | Alternative |
| --- | --- | --- |
| DB access | Drizzle ORM (`drizzle-orm`, `pg`; dev: `drizzle-kit`) — typed queries + generated SQL migrations | plain `pg` / Prisma |
| Routing (web) | `react-router-dom` | hand-rolled hash routing |
| Password hashing | `argon2` | `bcrypt` |
| Sessions | signed JWT in an `httpOnly` cookie (`jsonwebtoken`, `cookie-parser`) | `express-session` + `connect-pg-simple` |
| Payment | Stripe **test mode** (Checkout + webhook, `stripe` SDK) | local fake payment endpoint |
| Security headers / rate limit | `helmet`, `express-rate-limit` | — |

---

## Phase 1 — Postgres in Docker, products from the DB

- [ ] `docker-compose.yml` at repo root with `postgres:16` (named volume, healthcheck, port 5432)
- [ ] `.env.example` with `DATABASE_URL`; read and validate it with zod in `config/env.ts`
- [ ] `db/` module in `apps/server`: `pg` pool + Drizzle client; `db/schema.ts` holds all table definitions
- [ ] `drizzle.config.ts`; `products` table + indexes on `category`, `brand`, `price`, `name`
- [ ] Migrations generated with `drizzle-kit generate` and committed; applied with `pnpm db:migrate`
- [ ] Seed script that loads the current `data/products.ts` catalogue; `pnpm db:seed`
- [ ] Search, suggest and product services read from Postgres via Drizzle (filters, sort, pagination in the query)
- [ ] Zod schemas stay the API contract; map DB rows to them explicitly (no leaking DB columns)
- [ ] Keep services testable: data access behind small functions that tests can replace
- [ ] Route tests run against a real test DB; CI gets a Postgres service container
- [ ] Remove the in-memory catalogue once nothing uses it
- [ ] README: `docker compose up -d`, migrate, seed, `pnpm dev`

## Phase 2 — Product images

- [ ] Drizzle schema + migration: `image_url` column (nullable)
- [ ] Seed with stable public CDN images (e.g. `images.unsplash.com`), one per product
- [ ] Add `imageUrl` to zod schema, OpenAPI doc and web `types.ts`
- [ ] `ProductCard` shows the image: fixed aspect ratio, `loading="lazy"`, meaningful `alt`, placeholder on error/missing
- [ ] Desktop + mobile screenshots in the PR

## Phase 3 — Product detail page and richer fields

- [ ] Add routing to the web app (`/`, `/products/:id`)
- [ ] Drizzle schema + migration: new fields — `sku`, `pzn`, `pack_size`, `dosage_form`, `active_ingredients`,
      `usage_instructions`, `warnings`, `requires_prescription`, `stock_quantity`, `manufacturer`
- [ ] `GET /api/products/:id` returns the full detail shape (list keeps the slim shape); 404 for unknown id
- [ ] `ProductDetailPage` with loading / error / not-found states; card links to it
- [ ] Prescription-only products are marked and cannot be added to cart without a prescription flow (out of scope: just block + explain)
- [ ] e2e: search → open product → see details

## Phase 4 — Registration, login and authentication

- [ ] Drizzle schema + migration: `users` (`id`, `email` unique, `password_hash`, `name`, `role`, timestamps)
- [ ] `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- [ ] zod validation (email format, password min length), passwords hashed, generic "invalid credentials" message
- [ ] Session: `httpOnly`, `Secure` (prod), `SameSite=Lax` cookie; secret from env
- [ ] `requireAuth` middleware → 401; errors through `AppError`
- [ ] Web: register and login pages, header shows user / logout, auth state from `/auth/me`
- [ ] Tests: happy paths, duplicate email, wrong password, unauthenticated access; e2e register → login → logout

## Phase 5 — Cart

Plan (with the detail page redesign, account menu and the orders part of Phase 6):
[`docs/plans/cart-orders/`](plans/cart-orders/README.md).

- [x] Drizzle schema + migration: `carts`, `cart_items` (per user; one open cart)
- [x] `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:productId`, `DELETE /api/cart/items/:productId` (auth required)
- [x] Server is the source of truth for prices and stock; quantity limits validated
- [ ] Web: "Add to cart" on card and detail page, cart page with quantity edit, remove, subtotal; cart count in header
- [ ] e2e: add to cart → change quantity → remove

## Phase 6 — Checkout and orders

- [ ] Drizzle schema + migration: `orders`, `order_items` (price snapshotted at order time), `addresses`; order status enum
      (`pending_payment`, `paid`, `failed`, `cancelled`)
- [x] `POST /api/orders` creates an order from the cart in one transaction (re-checks stock and prices)
- [x] `GET /api/orders`, `GET /api/orders/:id` — users only see their own orders (403/404 otherwise)
- [ ] Web: checkout page (shipping address, order summary), "My orders" list and order detail
- [ ] e2e: cart → checkout → order created in `pending_payment`

## Phase 7 — Payment (third-party test mode)

- [ ] Stripe test keys in `.env` (never committed); `.env.example` documents them
- [ ] `POST /api/orders/:id/payment` creates a Stripe Checkout Session, returns redirect URL
- [ ] `POST /api/webhooks/stripe` verifies the signature, marks order `paid` / `failed` idempotently, decrements stock, clears cart
- [ ] Web: payment redirect, success page = **order confirmation** (order number, items, total, address), cancel page
- [ ] Tests mock the Stripe SDK at the boundary; manual check with Stripe test card `4242 4242 4242 4242`
- [ ] README: running `stripe listen` locally for webhooks

## Phase 8 — Authorization and security hardening

- [ ] Roles: `customer`, `admin`; `requireRole('admin')` middleware
- [ ] Admin-only product create/update endpoints (stock, price, image)
- [ ] `helmet` security headers, CORS restricted to the web origin, rate limit on auth endpoints
- [ ] CSRF protection for cookie-authenticated mutating routes (SameSite + origin check or token)
- [ ] Request body size limits; audit that every route validates params/body with zod
- [ ] No secrets or personal data in logs; DB user with least privilege
- [ ] Run `/security-review`; fix findings

## Track — Symptom assistant (AI chat)

Runs alongside the phases above. Frontend first with a mock engine; backend later. Plan:
[`docs/plans/symptom-assistant/`](plans/symptom-assistant/README.md).

- [x] S1 — Chat shell and streaming
- [ ] S2 — Structured replies and product cards
- [x] S3 — Safety layer (red flags, prescription rule, contextual warnings)
- [x] S4 — Case file and refine
- [x] S5 — Compare mode
- [x] S6 — Body map entry
- [ ] S7 — Polish and integrations: done except add to cart, which needs Phase 5
- [ ] Backend: LLM orchestration endpoint. Plan: [`docs/plans/symptom-assistant-backend/`](plans/symptom-assistant-backend/README.md)
