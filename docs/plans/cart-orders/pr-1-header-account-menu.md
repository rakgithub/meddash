# Plan — PR 1: Header and account menu (web only)

Status: draft 2026-11-20, awaiting approval of the decisions below.
Parent plan: [Product detail redesign, cart, orders, account menu — PR 1](README.md#pr-1--header-and-account-menu-web-only).
Roadmap entry: [Phase 5 — Cart](../../PLAN.md#phase-5--cart).

## Goal

- `/login` and `/register` show a slim header: brand and theme toggle only.
- When signed in, the header shows a round **initials button** that opens an account menu with the
  user's name and email, **Profile** and **Log out**.
- A new read-only **profile page** at `/profile`, only for signed-in users.
- A `RequireAuth` route guard that PR 3–5 reuse for `/cart` and `/orders`.

No server change, no new dependency.

## Where things stand

- [`AppHeader`](../../../apps/web/src/components/AppHeader/AppHeader.tsx) always renders brand, `SearchBar`,
  `UploadPrescriptionButton`, `ThemeToggle`, `UserMenu`.
- [`UserMenu`](../../../apps/web/src/features/auth/components/UserMenu/UserMenu.tsx) renders nothing while
  loading, "Log in" (with `state.from`) when signed out, and name + "Log out" button + error note when
  signed in.
- `useAuth()` gives `{ state, signIn, signOut }`; `state.user` is `{ id, email, name, role }` from
  `GET /api/auth/me`. `LoginPage` already honours `state.from` (same-origin paths only).
- `users.created_at` exists in the DB but is not in the `User` response.

## Decisions to make first

1. **Profile shows name and email only (no "member since").** The parent plan allows `createdAt`
   behind an `add-endpoint` change; leaving it out keeps this PR web only. It can be added later with
   one schema change. _Alternative:_ add `createdAt` to `userSchema` here (server + OpenAPI + web
   types + tests), which turns this into a server + web PR.
2. **No Orders item in the menu yet.** `/orders` doesn't exist until PR 5; a link to the 404 page
   would ship broken. PR 5 adds the item.
3. **Disclosure pattern, not `role="menu"`.** A button with `aria-expanded` + `aria-controls` that
   shows a panel of normal links/buttons. `role="menu"` obliges arrow-key roving focus and hides the
   items from normal Tab order; for two items the disclosure pattern is simpler and fully accessible.
   (This replaces `aria-haspopup="menu"` from the parent plan.)
4. **Logging out goes to `/`.** Otherwise logging out on `/profile` (and later `/cart`, `/orders`)
   bounces to `/login` via the guard, which reads as an error. Logging out elsewhere also lands on
   `/` — a small change from today, where the user stays on the page.
   _Implemented in `AuthProvider.signOut`, not `UserMenu`:_ React Router 7 wraps navigation in
   `startTransition`, so a separate `navigate("/")` after the auth state flips lets `RequireAuth`
   render first and redirect to `/login`. `signOut` sets the state and navigates in one transition.
5. **Slim header is decided by path** (`/login`, `/register`) inside `AppHeader` via `useLocation()`,
   not by a prop or layout route — one `if`, no routing restructure.

## Steps

### 1. Slim header on auth routes

- `AppHeader`: `const slim = pathname === "/login" || pathname === "/register";`
  When `slim`, render only the brand link and `ThemeToggle` (no search, upload, user menu).
- `useSearchQuery()` stays called unconditionally (hooks rule); it's cheap.
- CSS: `ThemeToggle` must sit at the right edge when search is absent — add `margin-left: auto` on
  the brand's sibling or `justify-content: space-between` under a `.slim` modifier on `.inner`.

### 2. Initials helper

`features/auth/utils/initials.ts` — pure function:

- First letter of the first and last word, upper-cased (`"Ana Weber"` → `"AW"`, `"Cher"` → `"C"`).
- Splits on whitespace, ignores extra spaces; uses `Array.from` so a non-BMP first character
  isn't split in half.
- Name is guaranteed non-empty by the server (`min(1)` after trim); still return `"?"` for an empty
  string instead of throwing.

### 3. Account menu in `UserMenu`

Loading and signed-out branches stay as they are. Signed-in branch becomes:

```
<div class=root ref=rootRef>
  <button aria-expanded={open} aria-controls={panelId} aria-label="Account menu">AW</button>
  {open && (
    <div id={panelId} class=panel>
      <p>Ana Weber</p><p>ana@example.com</p>
      <Link to="/profile" onClick={close}>Profile</Link>
      <button onClick={handleLogout}>Log out</button>
    </div>
  )}
  <p role="status">…existing error note…</p>
</div>
```

Behaviour:

- Click button toggles. `useId()` for `panelId`.
- **Escape** (keydown on the root) closes and returns focus to the button.
- **Outside click**: a `pointerdown` listener on `document`, added in a `useEffect` only while open,
  closes when the target is outside `rootRef`. Cleaned up on close/unmount.
- **Choosing an item** closes the panel. After Profile, focus moves naturally with the page; after
  a failed Log out the panel closes and focus returns to the button so the error note is next to it.
- **Route change** closes the panel (navigating via the brand link or search while open).
  Derive it: store the `pathname` the panel was opened on and treat it as closed when it differs —
  no effect needed.
- Log out: on success `navigate("/")` (decision 4); on failure keep the existing
  "Couldn't log out. Try again." status note.
- The button shows initials; the full name stays reachable in the panel (and as `title`).

Styles (`UserMenu.module.css`, follow `frontend-design`): 36px circle matching the header controls'
height, accent-soft fill, accent text; panel absolutely positioned under the button, right-aligned,
`var(--surface)`, `var(--border)`, `var(--shadow-hover)`, `z-index` above the search suggestions;
min-width ~220px, email truncated with ellipsis. Remove the now-unused `.name`/`.logout` rules.
Check both themes and the 720px breakpoint (the panel must not overflow the right edge on a phone).

### 4. `RequireAuth` guard

`features/auth/components/RequireAuth/RequireAuth.tsx`, exported from `features/auth/index.ts`:

- `loading` → `null`.
- `signed-out` → `<Navigate to="/login" replace state={{ from: pathname + search }} />`.
- `signed-in` → `children`.

### 5. Profile page

`features/auth/components/ProfilePage/` (`.tsx`, `.module.css`, `.test.tsx`), exported from the index.

- Reads the user from `useAuth()` (already loaded — no extra fetch, so no separate loading/error
  states beyond the guard's).
- `<h1>Your profile</h1>`, then a definition list: Name, Email. A link back to products.
- Assumes it's rendered under `RequireAuth`; if somehow signed out it renders nothing rather than
  throwing (narrow on `state.status`).

Route in `App.tsx`:

```tsx
<Route
  path="/profile"
  element={
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  }
/>
```

### 6. Tests

Unit (colocated, `userEvent`, role/label queries, mock `authApi` at the boundary as today):

- `initials.test.ts`: two words, one word, three words, extra spaces, empty, emoji/non-BMP first char.
- `AppHeader.test.tsx`: on `/login` and `/register` there is no search, no Upload prescription and no
  Log in link, but the brand link and Dark mode toggle are there. Existing tests stay.
- `UserMenu.test.tsx` (rewrite the signed-in cases):
  - Shows an "Account menu" button with "AW"; panel hidden.
  - Opening shows name, email, Profile link (`href="/profile"`) and Log out; `aria-expanded="true"`.
  - Escape closes and focus is back on the button.
  - Clicking outside closes.
  - Clicking Profile closes the panel and navigates to `/profile`.
  - Log out succeeds → lands on `/`, "Log in" shown.
  - Log out fails → status note shown, still signed in.
  - Loading and signed-out cases stay as they are.
- `RequireAuth.test.tsx`: loading renders nothing; signed out redirects to `/login` with
  `state.from` (assert via a `LoginPage`-like probe reading `useLocation().state`); signed in renders
  children.
- `ProfilePage.test.tsx`: shows name and email for the signed-in user.
- `App.test.tsx`: `/profile` signed out ends on the login page; signed in shows the profile heading.

e2e ([`e2e/auth.spec.ts`](../../../apps/web/e2e/auth.spec.ts)):

- Update the existing flow: replace `banner.getByText("Ana Weber")` with the "Account menu" button,
  and Log out clicks with "open menu → Log out".
- New test: register via API → visit `/` → open menu → Profile → see name and email → open menu →
  Log out → on `/` with "Log in".
- New test: `/profile` while signed out → login page → log in → back on `/profile`.
- New test: `/login` has no search box.

### 7. Verify and screenshots

- `pnpm verify:web` passes (lint, prettier, tsc, unit + coverage floor, build, e2e).
- In the browser (`web` + `server` launch configs): header on `/` signed out / signed in with menu
  open, `/login` slim header, `/profile` — at desktop and mobile widths, light and dark.
- Screenshots in `docs/screenshots/account-menu/`, committed and embedded in the PR via SHA links.

## Files touched

- `apps/web/src/App.tsx` — `/profile` route.
- `apps/web/src/components/AppHeader/AppHeader.{tsx,module.css,test.tsx}`
- `apps/web/src/features/auth/components/UserMenu/UserMenu.{tsx,module.css,test.tsx}`
- `apps/web/src/features/auth/components/RequireAuth/` (new)
- `apps/web/src/features/auth/components/ProfilePage/` (new)
- `apps/web/src/features/auth/utils/initials{,.test}.ts` (new)
- `apps/web/src/features/auth/index.ts`
- `apps/web/src/App.test.tsx`, `apps/web/e2e/auth.spec.ts`
- `docs/screenshots/account-menu/`

## Out of scope

- "Member since" / any change to `GET /api/auth/me` (decision 1).
- Orders link in the menu (PR 5), cart link and count in the header (PR 3).
- Editing the profile, avatars, admin-specific menu items.
