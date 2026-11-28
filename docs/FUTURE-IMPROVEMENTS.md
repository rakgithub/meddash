# Future improvements

Ideas noted after the React 19 upgrade that are not worth doing yet. Each says what would make it
worth picking up. When one is picked up, give it a plan in [`docs/plans/`](plans/README.md) and a
roadmap entry in [`docs/PLAN.md`](PLAN.md), then remove it from here.

| Improvement                                                           | Area      | Pick it up when                                       |
| --------------------------------------------------------------------- | --------- | ----------------------------------------------------- |
| [Error boundary around the routes](#error-boundary-around-the-routes) | web       | Before the app has real users                         |
| [Optimistic cart updates](#optimistic-cart-updates)                   | web, cart | Adding to or changing the cart feels slow             |
| [Suspense-based data loading](#suspense-based-data-loading)           | web       | Pages need to load data in parallel or before routing |
| [React Compiler](#react-compiler)                                     | web       | Re-renders show up as a measured performance problem  |

## Error boundary around the routes

**Now:** the web app has no error boundary. An error thrown while rendering (for example a
malformed API response that slips past a type guard) unmounts the whole tree and leaves a blank
page. The only trace is a console error.

**Proposal:**

- One error boundary around the routes in `apps/web/src/App.tsx`, below the header, so the header
  and navigation stay usable. It shows a short "Something went wrong" message with a link home, and
  resets when the route changes so navigating away recovers.
- React 19's root options in `apps/web/src/main.tsx` (`createRoot(el, { onUncaughtError,
onCaughtError, onRecoverableError })`) as the one place that reports render errors. Today they
  only reach `console.error`; this is where an error-tracking service would plug in later.

**To decide:** an error boundary must be a class component (React has no hook for it), which breaks
the "function components only" convention in `apps/web/CLAUDE.md`. Either allow one small class
there, with a comment saying why, or add the `react-error-boundary` package (a new dependency, so it
needs approval).

**Done when:** a component that throws during render shows the fallback instead of a blank page, the
header still works, and a unit test covers both the fallback and recovery after navigating.

## Optimistic cart updates

**Now:** `CartProvider` (`apps/web/src/features/cart/components/CartProvider/CartProvider.tsx`)
waits for the server's answer before the header count and the cart page change. Against the local
API the wait is not noticeable.

**Proposal:** React 19's `useOptimistic` for add, update and remove: show the new quantity at once,
replace it with the server's cart when it answers, and roll back with an error message if the
request fails.

**Cost:** the optimistic subtotal has to be computed on the client from product prices, which
duplicates pricing logic the server owns. Only the item count and quantities are safe to predict;
the subtotal should wait for the server.

**Pick it up when:** the API runs somewhere with real latency and the cart feels slow.

## Suspense-based data loading

**Now:** the data hooks (`useProduct`, `useOrder`, `useOrders`, `useProductSearch`, `useFacets`,
`useSuggestions`) load in an effect and abort the request when their input changes or the page
unmounts. They work and are tested.

**Proposal:** React 19's `use(promise)` with `<Suspense>` boundaries for loading states, or React
Router loaders so data starts loading before the page renders.

**Cost:** `use()` needs a cache of promises (it must not create a new promise on every render) and
Suspense and error boundaries in the right places. Loaders move data fetching into the route
config. Either way it is a redesign of every data hook and its tests, not an upgrade step.

**Pick it up when:** a page has request waterfalls worth removing, or loading states become hard
to keep consistent across pages.

## React Compiler

**Now:** values such as the `value` object in `CartProvider` are rebuilt on every render, so every
context consumer re-renders too. The repo avoids `useMemo` and `useCallback` without a clear need.

**Proposal:** turn on React Compiler (a Babel plugin for Vite) to memoize automatically, with no
`useMemo` or `useCallback` in the code.

**Cost:** a new dev dependency and a build step that changes the emitted code. `eslint-plugin-react-hooks`
7 already enforces the rules the compiler relies on, so the code should need few or no changes.

**Pick it up when:** the React DevTools profiler shows re-renders that cost real time.
