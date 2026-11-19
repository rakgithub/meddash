---
name: add-endpoint
description: Add or change an API endpoint in apps/server end to end - zod schema, route, controller, service, OpenAPI entry, web types and tests. Use whenever a task adds a route or changes a request or response shape.
---

# Add or change an API endpoint

Read `apps/server/CLAUDE.md` first; it wins if anything here disagrees. Use `suggest` as the reference example: `schemas/suggest.schema.ts`, `services/suggest.service.ts`, `controllers/search.controller.ts`, `routes/search.routes.ts`, `routes/suggest.routes.test.ts`, `openapi/document.ts`.

Paths below are under `apps/server/src/` unless they say otherwise. Relative imports end in `.js`.

## Steps

1. **Schema** - `schemas/<name>.schema.ts`
   - Input schema (query, params or body) with `.strict()`, trimmed strings and min/max limits. Add `.openapi({ description, example })` to fields.
   - Response schema with `.openapi("<Name>")` so it appears under `components.schemas`.
   - Export the types with `z.infer`. Don't write types by hand.
2. **Service** - `services/<name>.service.ts`
   - A plain function with no Express types. It takes its data source as a parameter with a default, so tests can inject fixtures.
   - Expected failures throw `AppError(statusCode, message)`, for example 404 for an unknown id.
3. **Controller** - `controllers/<area>.controller.ts`
   - Thin: read `res.locals.query` (or validated params/body), call the service, `res.json(...)`.
   - Type the response as `Response<ResponseType, { query: QueryType }>`. No logic and no ad-hoc error responses.
4. **Route** - `routes/<area>.routes.ts`
   - Attach `validateQuery(schema)` (or the matching validator), then the controller.
   - A new router is registered in `routes/index.ts`.
5. **OpenAPI** - `openapi/document.ts`
   - `registry.registerPath` with `request` and every response the route can return (200 and 400, plus 404 and others where they apply), using the zod schemas.
   - The endpoint isn't done until this entry exists.
6. **Web types** - `apps/web/src/features/<feature>/types.ts`
   - Mirror the response shape. If the web app calls the endpoint, add an `api/` module that uses `apiGet` from `lib/apiClient` and accepts an `AbortSignal`, with a colocated test.
7. **Tests** (colocated `*.test.ts`)
   - Service: unit tests with injected data, including edge cases.
   - Schema: valid input, plus each rejection rule.
   - Route (supertest against `createApp()`): happy path, each validation failure returning 400 with `error.details[].field`, and 404 where applicable.
   - `routes/docs.routes.test.ts`: assert the path, its parameters, its response codes and its component schemas.
8. **Docs** - Add the endpoint to the API table in the root `README.md`.

## Done when

- `pnpm verify:server` passes, plus `pnpm verify:web` if web files changed.
- If an existing response shape changed, the PR description says it's an API contract change and lists the schema, OpenAPI and web type updates.
